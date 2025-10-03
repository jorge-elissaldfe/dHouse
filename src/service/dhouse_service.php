<?php
	/** dHouse
	  * Tasmota devices manager
	  * Jorge Elissalde 2025
	  *
	  * dhouse service
	  * log data to sqlite3
	  * execute scenes
	  * send notify messages for selected events
    **/

	define ("CONFIG_FOLDER", "../web/config/");
	define ("NTFY_FOLDER", "../ntfy/");
	define ("DATABASE_FOLDER", "../db/");
	define ("DEFERRED_STATUS_TIME", 15);	# debounce seconds that must elapse before trigger online/offline notification

	include ("../web/config.php");
	include ("phpMQTT.php");
	include ("scenes.php");
	include ("notify.php");

	$mqtt = "";
	$db = "";
	$config = "";
	$dbDisabled = false;

	$scenes = [];
	$devices = [];				// list of all devices, tasmota_xxxxx, tasmota_yyyyy, etc.
	$deviceUpgrade = [];		// keep tracking of devices under update & versions
	$debug = false;
	$forkScenes = false;

	/** devicePower keeps the power status for each device: 
	  * $devicePower[$device][0..n]
	  *
	  * index will be:
	  * 0 = single power switch device
	  * 1..n = multiple power switch device
	 **/
	$devicePower = array();
							
	$runningScene = false;		// avoid scenes loop: a device change could start a new scene that modify the first one

	$runningSceneName = "";		// sent from children when fork for a scene running

	$storeLog = [];				// information for log store
								// src, device, power switch comes in different mqtt data lines

	$skipDeviceWhenScene = [];	// devices that should not be log when running a scene
								// the scene motor itself will log the information

	$cellphoneNotify = [];		// notifications to send when device start, stop, on, off...


	$deviceAlive = [];			// is device alive? required for online/offline notifications

	$timerScenes = [];			// scenes requiring a day timer to start
	

	/* --------------------------------------------------------------------- */

	$notifyPhone = new NotifyClass();

	$timezone = trim(file_get_contents('/etc/timezone'));
	date_default_timezone_set($timezone);

	// signal receive for SIGUSR1
	pcntl_async_signals(true);

	echo "Starting process. PID: " . getmypid() . "\n";

	getConfig();
	connectSQL();
	connectMQTT();
	requestDevicesStatus();		// request status for each device
	setEventTimer();			// required for scenes using time
	mqttLoop();

	function getConfig() {
		global $config;
		global $scenes;
		global $deviceUpgrade;
		global $cellphoneNotify;

		
		$deviceUpgrade = [];
		$config = [];
		$scenes = [];
		$cellphoneNotify = [];

		try {
			$js = file_get_contents(CONFIG_FOLDER . "dhouse.config");
			$config = json_decode($js, true);
			$js = file_get_contents(CONFIG_FOLDER . "scenes.config");
			$scenes = json_decode($js, true);
		}
		catch (Exception $e) {
			echo "Configuration Error: " . $e->getMessage() - "\n";
			return;
		}
	
		if (file_exists(CONFIG_FOLDER . "notify.config")) {
			$js = file_get_contents(CONFIG_FOLDER . "notify.config");
			try {
				$cellphoneNotify = json_decode($js, true);
			}
			catch (Exception $e) {
				echo "Error in notify.config file: " . $e->getMessage() - "\n";
			}
		}
		setScenesUsingTimer();
	}

	pcntl_signal(SIGUSR1, function($sig) {
    	echo "Received SIGUSR1 $sig\n";
	});

	// signal receive for fork end
	// used for scenes
	pcntl_signal(SIGCHLD, function () {
		global $runningScene;
	    while (pcntl_waitpid(-1, $status, WNOHANG) > 0) {
			usleep(100);
    	}
		$runningScene = false;
	});

	// required to check scenes by date/time
	function setEventTimer() {
		pcntl_signal(SIGALRM, "tick_handler");
		pcntl_alarm(1);
	}

	function tick_handler() {
		global $timerScenes;
 		static $resetDone = false;

		if (empty($timerScenes)) {
			// alarm is automatically stopped due to not call pcntl_alarm
			echo "--- not timer scenes, setting timer off\n";
			return ;
		}

		$currentTime = date('H:i');

		// restart 'started' switch at 00:00
		if (!$resetDone && $currentTime === "00:00") {
			$resetDone = true;
			foreach ($timerScenes as &$scene)
				$scene["started"] = false;
			unset($scene);
		}
		else
			$resetDone = false;
		
		// check scenes that must start now
		foreach ($timerScenes as $key => $scene) {
       		if ($currentTime === $scene["time"] && !$scene['started']) {
				/** this is the time to start this scene
				 ** other triggers must be checked
				 ** if scene is not started keep checking the whole minute
				 ** to allow device or button to be triggered for this time
                 **/
				if (startSceneByTimer($scene["scene"])) {
					echo "--- scene started by timer: " . $scene["scene"] . "\n";
					$timerScenes[$key]['started'] = true;
				}
       		}
		}
	    pcntl_alarm(1);
	}

	
	function connectSQL() {
		global $db;
		global $dbDisabled;

		if (!class_exists('SQLite3')) {
			echo "Could not connect to SQLite3: install php-sqlite3 module and Sqlite3\n";
			echo "Connection to log database is disabled\n";
			$dbDisabled = true;
			return;
		}
		try {
			$db = new SQLite3(DATABASE_FOLDER . "dhouse.db");
			$db->enableExceptions(true);	
		}
		catch (Exception $e) {
			echo "DB Error: " . $e->getMessage() - "\n";
			return;
		}
		echo "Database for log connection success\n";
	}

	function connectMQTT() {
		global $mqtt;
		global $config;

		$username = "";
		$password = "";

		echo "Connecting to MQTT Server: " . MQTT_SERVER . ":" .MQTT_PORT ."\n";

		// $clientId = 'test-publisher';

		$mqtt = new bluerhinos\phpMQTT(MQTT_SERVER, MQTT_PORT, "dhouseMQTTD".rand());
		if (!$mqtt->connect(true,NULL,$username,$password)) {
			echo "Could not connect MQTT. Exiting.";
  			exit(1);
		}
	}

	// get status for each existing device
	// required to set power status
	function requestDevicesStatus() {
		global $config;
		global $mqtt;

		$devices = array_keys($config["dHouse"]["devices"]);
		foreach ($devices as $dev) {
			$mqtt->publish("cmnd/$dev/Status",0);
			$mqtt->publish("cmnd/$dev/State",'');
		}
	}

	function mqttLoop() {
		global $mqtt;

		$topics['#'] = array('qos' => 0, 'function' => 'procMsg');
		$mqtt->subscribe($topics, 0);
		$notificationCounter = 0;
		while($mqtt->proc()) {
			usleep(1000);
			if (++$notificationCounter > 10) {
				$notificationCounter = 0;
				checkStatusNotifications();
			}
		}
		$mqtt->close();
	}

	function procMsg($topic, $msg) {
		/** Important!!!
		  * messages sequence does not happens for the same procMsg call
		  * one call will set 'source', another call will set 'power ='
		  * different devices could alternate calls here
		  */

		// Topic: stat/tasmota_0D7177/POWER // POWER1 // POWER2
		// Msg: OFF

		$parts = explode('/', $topic);
		$device = $parts[1];

		if (str_starts_with($topic, "tele")) {
			// echo "tele: $topic - $msg\n";
			processTeleMessage($topic, $msg);
		}
		if (str_starts_with($topic, "dhouse")) {
			// dhouse internal message sent from web interfase
			getDHouseCommand($topic, $msg);
			return;
		}
		if (str_ends_with($topic, "LOGGING")) {
			logPower($device,$topic, $msg);
			return;
		}
		if (str_ends_with($topic, "RESULT")) {
			getFirmwareUpdateData($device,$topic, $msg);
			getPowerState($device,$topic, $msg);
			startSceneByButton($topic, $msg);
			return;
		}
		if (str_ends_with($topic, "UPGRADE")) {
			getFirmwareUpdateResult($device, $topic, $msg);
			return;
		}
	}

	function processTeleMessage($topic, $msg) {
		$parts = explode('/', $topic);
		if ($parts[2] == 'LWT' && ($msg == "Online" || $msg == "Offline")) {
			setDeviceAlive($parts[1], $msg);
		}
	}

	// store status, new status and time to anti debounce online/offline messahes
	function setDeviceAlive($device, $msg) {
		global $deviceAlive;
		global $cellphoneNotify;
		global $config;
		global $notifyPhone;

		/** expected messages:
			tele message: tele/tasmota_0F2C45/LWT Online
			tele message: tele/tasmota_0F2C45/LWT Offline

			avoid to send cellphone message when application starts
			all devices will send this status (Online/Offline)
			if deviceAlive[device] does not exists, means that the application is starting
		**/
	
		if (!isset($cellphoneNotify[$device][$msg]["enable"]) || $cellphoneNotify[$device][$msg]["enable"] == "no") {
			// online/offline notification not set for this device
			return;
		}

		$currentStatus = $msg;

		if (!isset($deviceAlive[$device])) {
			// first time seen this device, set status
			$deviceAlive[$device] = [];
			$deviceAlive[$device]['status'] = $currentStatus;
			$deviceAlive[$device]['new_status'] = "";
			$deviceAlive[$device]['time'] = microtime(true);
			return;
		}

 		$now = microtime(true);
		$lastseen = $now - $deviceAlive[$device]['time'];

		if ($deviceAlive[$device]['status'] == $currentStatus && $lastseen < DEFERRED_STATUS_TIME) {
			$deviceAlive[$device]['new_status'] = "";
			$deviceAlive[$device]['time'] = $now;
			return;
		}
		$deviceAlive[$device]['time'] = $now;
		$deviceAlive[$device]['new_status'] = $currentStatus;
	}


	// check online/offline status change and send notifications
	// when time > DEFERRED_STATUS_TIME to avoid bouncing status
	function checkStatusNotifications() {
		global $deviceAlive;
		global $cellphoneNotify;
		global $config;
		global $notifyPhone;

		$now = microtime(true);
		foreach ($deviceAlive as $device => $data) {
			$elapsed = $now - $data['time'];
			if ($elapsed > DEFERRED_STATUS_TIME) {
				if ($data['new_status'] != "" &&  $data['new_status'] !== $data['status']) {
					$deviceAlive[$device]['status'] = $data['new_status'];
					$deviceAlive[$device]['new_status'] = "";

					// send notification for this device
					$status = $deviceAlive[$device]['status'];
					$userMessage = $cellphoneNotify[$device][$status]["message"];
					$friendlyName = $config['dHouse']['devices'][$device]['FriendlyName'] ?? $device;
					$notify = "$friendlyName $status\n";
					if (!empty($userMessage))
						$notify .= "\n$userMessage";
					$notifyPhone->sendCellphoneNotify($notify, ($status == "Offline") ? "no_entry":"heavy_check_mark");
				}
			}
		}
	}


	// catches anything related to firmware update
	// stat/tasmota_608461/RESULT = {"Upgrade":"Version 15.0.1 from http://ota.tasmota.com/tasmota/release/tasmota.bin.gz"}
	function getFirmwareUpdateData($device, $topic, $msg) {
		global $deviceUpgrade;
		global $debug;

		try {
    		$data = json_decode($msg, true);
		} catch (Exception $e) {
    		echo '--- json exception: ', $e->getMessage();
			return;
		}
		if ($data == null)
			return;

		if (!array_key_exists("Upgrade", $data))
			return;

		// store here the upgrade flag and version for this device
		// the successfully updated data will come later
		// get '15.0.1' from: Version 15.0.1 fro
		$parts = explode(' ', $data["Upgrade"]);	
		$deviceUpgrade[$device] = $parts[1];
		
		if ($debug)
			echo "Upgrade: $device to release: " . $deviceUpgrade[$device] . "\n";
	}

	// stat/tasmota_608461/UPGRADE = {"Upgrade":"Successful. Restarting"}
	function getFirmwareUpdateResult($device, $topic, $msg) {
		global $db;
		global $config;
		global $deviceUpgrade;
		global $debug;
		global $dbDisabled;

		$data = json_decode($msg, true);
		if ($data == null)
			return;
		if (!array_key_exists("Upgrade", $data))
			return;

		$parts = explode('/', $topic);
		if (!($parts[0] === 'stat' && $parts[2] === 'UPGRADE'))
			return;
		$device = $parts[1];

		if (str_starts_with($data["Upgrade"],"Successful")) {
			if (!isset($deviceUpgrade[$device]))
				return;
			$status = $deviceUpgrade[$device];	// update version
			if ($status == '')
				return;							// already stored or never retrieved firmware version
		}
		else
			$status = "ERROR";

		$date = date('Y-m-d H:i:s');
		$friendlyName = $config['dHouse']['devices'][$device]['FriendlyName'] ?? $device;

		if (!$dbDisabled) {
			try {
				$q = "INSERT INTO log values (NULL,'$date','$device','UPDATE','$status','Manual','$friendlyName')";
				$db->exec($q);
			}
			catch (Exception $e) {
				echo "DB Error: " . $e->getMessage() - "\n";
			}
		}

		// avoid reentrance because device restart and multiple UPGRADE messages
		$deviceUpgrade[$device] = '';
		if ($debug)
			echo "-- $q\n";
	}

	// internal dHouse message sent to service
	// reload configuration, run scene, etc
	function getDHouseCommand($topic, $msg) {
		global $debug;
		global $runningSceneName;
		global $notifyPhone;

		if (str_ends_with($topic, "StartingScene")) {
			// this message was sent from the fork service while running a scene
			// it is notifying that a scene is starting to run
			echo "--- child starting scene: $msg\n";
			$runningSceneName = $msg;
			return;
		}

		if (str_ends_with($topic, CMD_TEST_MESSAGE)) {
			$notifyPhone->sendCellphoneTestMessage($msg);
			return;
		}

		if (str_ends_with($topic, CMD_RUN_SCENE)) {
			$scenes = [];
			$scenes[] = $msg;
			forkToRunScenes($scenes);
			return;
		}

		if (str_ends_with($topic, CMD_RELOAD)) {
			echo "--- configuration reload\n";
			getConfig();
			return ;
		}
	}

	/** get state of any defined power
	  * format for single powerSwitch:
	  *
	  * stat/tasmota_0D7177/RESULT
	  * {"Time":"2025-05-17T10:34:19","Uptime":"1T00:17:38","UptimeSec":87458,"Heap":24,"SleepMode":"Dynamic","Sleep":50,"LoadAvg":19,"MqttCount":1,"POWER":"OFF","Wifi":{"AP":1,"SSId":"chimpance","BSSId":"40:3F:8C:84:60:D8","Channel":11,"Mode":"11n","RSSI":98,"Signal":-51,"LinkCount":1,"Downtime":"0T00:00:06"}}
	  * 
	  * format for multiple powerSwitch:
	  * 
	  * stat/tasmota_E2F9CB/RESULT
	  * {"Time":"2025-05-17T10:34:29","Uptime":"1T17:39:43","UptimeSec":149983,"Heap":24,"SleepMode":"Dynamic","Sleep":50,"LoadAvg":19,"MqttCount":1,"POWER1":"OFF","POWER2":"ON","Wifi":{"AP":1,"SSId":"chimpance","BSSId":"40:3F:8C:84:60:D8","Channel":11,"Mode":"11n","RSSI":100,"Signal":-43,"LinkCount":1,"Downtime":"0T00:01:57"}}
	  *
	  * store status (ON/OFF) for each device in "devicePower" array
 	**/ 

	function getPowerState($device, $topic, $msg) {
		global $devicePower;

		// get every POWER key defined
		$data = json_decode($msg, true);
		foreach ($data as $key => $value) {
    		if (preg_match('/^POWER(\d*)$/i', $key, $matches)) {
        		$powerIndex = ($matches[1] === "") ? 0 : intval($matches[1]);
				if (!isset($devicePower[$device]) || !is_array($devicePower[$device]))
    				$devicePower[$device] = array();

				// store value in array only if not already defined
				// this is to prevent a value change before real ON/OFF change menssage is received
				if (!isset($devicePower[$device][$powerIndex]))
					$devicePower[$device][$powerIndex] = $value;
			}
    	}
	}

	// log power info to database
	function logPower($device, $topic, $msg) {
		global $db, $dbDisabled, $storeLog;
		global $devices, $devicePower;
		global $config;
		global $debug;
		global $runningScene;
		global $runningSceneName;
		global $skipDeviceWhenScene;
		global $notifyPhone;

		/** catch source for power on/off
		  * stat/tasmota_C38D64/LOGGING
	  	  *	12:53:48.250 SRC: MQTT
		 **/

		if ($debug)
			echo ">>> " . $topic . "\n" . $msg . "\n";

		$parts = explode(" ", $msg); 

		if (isset($parts[1]) && $parts[1] == "SRC:") {
			$storeLog[$device]['source'] = $parts[2];		// stores MQTT/Web/etc
			return ;
		}

		
		/** catch power on/off message
		  *	stat/tasmota_E2F9CB/LOGGING
		  * 20:02:13.163 MQT: stat/tasmota_E2F9CB/RESULT = {"POWER1":"ON"}
  		  *
		  * stat/tasmota_0D7177/LOGGING
		  * 20:03:51.168 MQT: stat/tasmota_0D7177/RESULT = {"POWER":"ON"}
		  *
	  	 **/
		$friendlyName = $config['dHouse']['devices'][$device]['FriendlyName'] ?? $device;

		if (preg_match('/POWER\d*\s=\s/', $msg)) {
			preg_match('/POWER(\d*)\s=\s/i', $msg, $matches);
    		$powerSwitch = ($matches[1] === "") ? 0 : (int)$matches[1];
			if (!str_ends_with($msg, "ON") && !str_ends_with($msg, "OFF")) {
echo "-- log error for power: $device, $topic, $msg // friendly = $friendlyName\n";
				return;
			}

        	$powerStatus = str_ends_with($msg, "ON") ? 'ON':'OFF';

			if (isset($storeLog[$device][$powerSwitch]['src'])) {
				$source = $storeLog[$device][$powerSwitch]['src'];
				unset($storeLog[$device][$powerSwitch]['src']);
			}
			else
				if (isset($storeLog[$device]['source']))
					$source = $storeLog[$device]['source'];
				else
					$source = "unknown";

			// search in devices that must be skipped because they are already logged at scene motor
			// this mechanism will also prevent a new scene started by on/off of a device
			// ==> startSceneByDevice($device, $powerSwitch); last line of current logic

			if ($powerSwitch>0)
				$key = "$device:switch_$powerSwitch";
			else
				$key = $device;

			if (isset($skipDeviceWhenScene[$key])) {
				// skip this device because it will already be logged from running scene
				--$skipDeviceWhenScene[$key];
				if ($skipDeviceWhenScene[$key] == 0)
					unset($skipDeviceWhenScene[$key]);

				// keep tracking of device power
				$devicePower[$device][$powerSwitch] = $powerStatus;	
				return;
			}

			$source = $source == 'MQTT' ? 'Manual':$source;

			// do not log any data if the switch it is not really changed
			// information could come from several different queries
	
			if (!array_key_exists($device, $devicePower))					// not yet initialized
				return;
			if (!array_key_exists($powerSwitch, $devicePower[$device]))		// not yet initialized
				return;

			if ($devicePower[$device][$powerSwitch] == $powerStatus || 		// not yet initialized
				$devicePower[$device][$powerSwitch] == '') 
				return;
			
			$devicePower[$device][$powerSwitch] = $powerStatus;				// keep tracking of device power
			$command = "POWER";	
			$date = date('Y-m-d H:i:s');

			// use original message time
			// when running scenes the message could come several seconds later than the real time
			// not recomended because devices could be not propertly set timezone
			// $date = date('Y-m-d ') . substr($msg, 0,8);

			if ($powerSwitch != 0)
				$command .= "($powerSwitch)";
			if ($runningScene)
				$source = "Scene: $runningSceneName";

			if (!$dbDisabled) {
				try {


echo "-- log power: $device, $topic, $msg // source=$source // friendly = $friendlyName\n";


					$q = "INSERT into log values (NULL,'$date','$device','$command','$powerStatus','$source','$friendlyName')";
					$db->exec($q);
				}
				catch (Exception $e) {
					echo "DB Error: " . $e->getMessage() - "\n";
				}
				if ($debug)
					echo "------ $date dbStore: $q\n";
			}

			// send notification to user cellphone if required
			$notifyPhone->notifyCellphoneUserSwitch($device, $friendlyName, $powerStatus, $powerSwitch, $source);
			startSceneByDevice($device, $powerSwitch);
		}
	}		


	function getDevicePowerSwitchIndex($device, &$multiSwitchDevice) {
		$n = strpos($device, ":switch_");
		if ($n === false) {
			// not a multi switch device, power status will be in index 0
			return 0;	
		}
		$powerIndex = substr($device, $n+8);
		$multiSwitchDevice = substr($device,0,$n);
		return $powerIndex;
	}

?>


