<?php
	/** dHouse
	  * Tasmota devices manager
	  * Jorge Elissalde 2025
    **/


// TODO: move to a class

	function forkToRunScenes($relatedScenes) {
		global $runningScene;
		global $forkScenes;


		if ($runningScene)	{	// avoid scenes loop: a device change could start a new scene that modify the first one
			echo "-- already running scene";
			return;
		}
		$runningScene = true;

		if (!$forkScenes) {
			runScenes($relatedScenes);
			return ;
		}

		// execute scenes listed in 'relatedScenes'
		$pid = pcntl_fork();
		if ($pid == -1) {
			// fork error running scenes from this process
			runScenes($relatedScenes);
			return ;
		}
		if ($pid == 0) {
			// child process
			runScenes($relatedScenes);
			exit();
		}
	}


	// execute every 'actions' for each scene in 'relatedScenes'
	// a fork for running scenes is not a good solution, the fork itself will stop before start/stop info will arrive
	// and we will have no more information about running scene
	function runScenes($relatedScenes) {
		global $scenes;
		global $mqtt;
		global $devicePower;
		global $runningScene;
//		global $storeLog;
		global $skipDeviceWhenScene;
		global $forkScenes;
		global $db;
		global $config;
		
//		if ($runningScene)		// avoid scenes loop: a device change could start a new scene that modify the first one
//			return;

		$runningScene = true;
		//foreach ($relatedScenes as $index => $sceneName) {
//		for ($index = 0; $index < count($relatedScenes); $index++) {

		
		// avoid a loop of scenes 
		// A->B->C->A
		$sceneAlreadyDone = [];

		$keys = array_keys($relatedScenes);
		$j = 0;

		while ($j < count($keys)) {
    		$index = $keys[$j];
    		$sceneName = $relatedScenes[$index];
			if (isset($sceneAlreadyDone[$sceneName])) {
				echo "-- skip scene already done: $sceneName, loop avoid\n";
				$j++;
				continue;
			}
			$sceneAlreadyDone[$sceneName] = true;
			
			if ($forkScenes)
				$mqtt->publish("dhouse/cmd/StartingScene",$sceneName);

			echo "--- running scene: $sceneName\n";

			$actionsArray = $scenes[$sceneName]["actions"];
			for ($i=0; $i<count($actionsArray); $i++) {
				$actionData = $actionsArray[$i];
				switch ($actionData['action']) {
					case 'device':	
							$device = $actionData['device'];

							// skip this device from the regular log
							// the log will be sent from here
							// key: tasmota_D937AB:switch_2
							// or:  tasmota_439639
							if (!isset($skipDeviceWhenScene[$device]))
								$skipDeviceWhenScene[$device] = 0;
							++$skipDeviceWhenScene[$device];

							$powerSwitch = getDevicePowerSwitchIndex($device,$multiSwitchDevice);
							if ($powerSwitch > 0) 
								$device = $multiSwitchDevice;

							// don't send power change command if power is already on/off
							// no way to know the change here if several scenes are running
							// if ($devicePower[$device][$powerSwitch] !== $actionData['deviceState']) {

								// store scene log information for this device
								// useless when using fork
								// $storeLog[$device][$powerSwitch]['src'] = "Scene: $sceneName";

								if ($actionData['deviceState'] == 'TOGGLE') 
									$powerAction = $devicePower[$device][$powerSwitch] == 'ON' ? 0:1;
								else
									$powerAction = $actionData['deviceState'] == 'ON' ? 1:0;

//echo "$index - $sceneName - " . $actionData['action'] . " - $powerAction \n";

								if ($powerSwitch > 0) 
									$mqtt->publish("cmnd/$device/Power${powerSwitch}", $powerAction);
								else
									$mqtt->publish("cmnd/$device/Power", $powerAction);

								// store log information
								$date = date('Y-m-d H:i:s');
								$source = "Scene: $sceneName";
								$powerStatus = $powerAction == 1 ? 'ON':'OFF';
								$command = "POWER";
								if ($powerSwitch != 0)
									$command .= "($powerSwitch)";
								$friendlyName = $config['dHouse']['devices'][$device]['FriendlyName'] ?? $device;
								$q = "INSERT into log values (NULL,'$date','$device','$command','$powerStatus','$source','$friendlyName')";
								$db->exec($q);
							// }
							break;
					case 'scene':
// TODO: add to a alreadyExecuted array to avoid running it in a loop
							echo "-- adding scene: " . $actionData["scene"] . "\n";
							$relatedScenes[] = $actionData["scene"];
							$keys = array_keys($relatedScenes);
							break;
					case 'delay':
							$delayTime = $actionData['delay'];
							sleep($delayTime);
							break;
				}
			}
			$j++;
		}
//var_dump($skipDeviceWhenScene);

		$runningScene = false;
	}


	// init the array for scenes requiring a time of day
	function setScenesUsingTimer() {
		global $timerScenes;
		global $scenes;

		$timerScenes = [];

		// search for scenes 
		$relatedScenes = getScenesWithTimeTrigger();

		if (!empty($relatedScenes)) {
			echo "--- enabling timer for timer scenes\n";

			/* fill timerScenes, format:
				$timerScenes = [
    				[ 'time' => '09:07', 'started' => false, 'scene' => 'scene name' ],
    				[ 'time' => '09:03', 'started' => false, 'scene' => 'other scene name' ],
				];
			*/

			foreach ($relatedScenes as $scene) {
				$timerScenes[] = [ "time" => $scene["time"], "started" => false, "scene" => $scene["scene"] ];
				echo "--- setting timer scene: [{$scene['scene']}] time: {$scene['time']}\n";
			}

			pcntl_alarm(1);
		}
	}

	// search for button ID and return real name
	function searchButton($buttonID) {
		global $config;

		if (isset($config["dHouse"]["buttons"])) 
			foreach ($config["dHouse"]["buttons"] as $subarray) 
			    if (array_key_exists($buttonID, $subarray)) {
        			return $subarray[$buttonID];
    			}
		return false;
	}

	// return array with any scene having 'buttonID' as button trigger
	function getScenesWithButtonTrigger($buttonID) {
		global $scenes;

		$relatedScenes = [];
		foreach ($scenes as $name => $elem) {
			if ($elem['enable'] == 1) {
	    		foreach ($elem['triggers'] as $trigger) {
        			if (isset($trigger['action'], $trigger['button']) &&
            			$trigger['action'] === 'button' &&
            			$trigger['button'] === $buttonID) {
	            		$relatedScenes[] = $name;
            			break; 
        			}
    			}
			}
		}
		return $relatedScenes;
	}

	// return array with any scene having time of day trigger
	function getScenesWithTimeTrigger() {
		global $scenes;

		$relatedScenes = [];
		foreach ($scenes as $name => $elem) {
			if ($elem['enable'] == 1) {
	    		foreach ($elem['triggers'] as $trigger) {
        			if (isset($trigger['action'], $trigger['time']) &&
            			$trigger['action'] === 'time') {
	            		$relatedScenes[] = [ "scene" => $name, "time" => $trigger["time"] ];
            			break; 
        			}
    			}
			}
		}
		return $relatedScenes;
	}

	/** return a list of all scenes containing 'device' as device  trigger 
	 **	scnene device for multiple switch devices will have the format device:switch_n
	 **/
	function getScenesWithDeviceTrigger($device, $powerSwitch) {
		global $scenes;

		if ($powerSwitch > 0)
			$device = "${device}:switch_${powerSwitch}";

		$relatedScenes = [];
		foreach ($scenes as $scene => $data) {
			if ($data['enable'] == 1) {
	    		foreach ($data['triggers'] as $trigger) {
        			if (isset($trigger['action'], $trigger['device']) &&
            			$trigger['action'] === 'device' &&
            			$trigger['device'] === $device) {
	            		$relatedScenes[] = $scene;
            			break; 
        			}
    			}
			}
		}
		return $relatedScenes;
	}

	/** remove all scenes that requires a RF button trigger
	 ** the scene is not going to run if a button is required
	 ** scenes requiring RF button will start from startSceneByButton
	 **/
	function removeScenesWithButtonTrigger($relatedScenes) {
		global $scenes;
		global $devicePower;

		$newRelatedScenes = $relatedScenes;
		foreach ($relatedScenes as $sceneIndex => $sceneName) {
			$triggersArray = $scenes[$sceneName]["triggers"];
			for ($i=0; $i<count($triggersArray); $i++) {
				$triggerData = $triggersArray[$i];
				if ($triggerData['action'] == 'button') {
					unset($newRelatedScenes[$sceneIndex]);
				}
			}
		}
		return $newRelatedScenes;
	}


	function getTimerScenesIndex($searchingScene) {
		global $timerScenes;

		foreach ($timerScenes as $key => $scene)
    		if ($scene["scene"] === $searchingScene)
				return $key;
		return -1;
	}

	// remove scenes that requires time of day <> now
	// check that scene wasn't already started in $timerScenes
	function removeScenesWithUnmatchedTimeofday($relatedScenes) {
		global $scenes;
		global $timerScenes;

		$newRelatedScenes = $relatedScenes;
		foreach ($relatedScenes as $sceneIndex => $sceneName) {
			$triggersArray = $scenes[$sceneName]["triggers"];
			for ($i=0; $i<count($triggersArray); $i++) {
				$triggerData = $triggersArray[$i];
				if ($triggerData['action'] == 'time') {
					$currentTime = date('H:i');

					if ($currentTime != $triggerData["time"]) {
						echo "--- skip scene, not expected time: " . $triggerData["time"] . "\n";
						unset($newRelatedScenes[$sceneIndex]);
					}
					else {
						$index = getTimerScenesIndex($sceneName);
						// time of day matches, check if this scene wasn't already started by time
						if (isset($timerScenes[$index]["started"]) && $timerScenes[$index]["started"]) {
							echo "--- skip scene already started by time\n";
							unset($newRelatedScenes[$sceneIndex]);
						}
						else {
							// prevent a second start of this scene by timer
							$timerScenes[$index]['started'] = true;
						}
					}
				}
			}
		}
		return $newRelatedScenes;
	}

	// the scene has a time = now
	// check other conditions, button, device
	function startSceneByTimer($scene) {
		$relatedScenes = [];
		$relatedScenes[] = $scene;

		$relatedScenes = removeScenesWithUnmatchedDevices($relatedScenes);
		if (empty($relatedScenes))
			return false;

		$relatedScenes = removeScenesWithButtonTrigger($relatedScenes);
		if (empty($relatedScenes))
			return false;

		forkToRunScenes($relatedScenes);
		return true;
	}

	/** the device '$device' has a power change
     ** test if this is a trigger for scene start
	 **/
	function startSceneByDevice($device, $powerSwitch) {

		$relatedScenes = getScenesWithDeviceTrigger($device, $powerSwitch);
		if (count($relatedScenes) == 0)
			return;

		/** we have a list of scenes that requires '$device' as a device trigger
		 ** remove from 'relatedScenes' any scene with a device does not matches deviceState (on/off)
		 **/
		$relatedScenes = removeScenesWithUnmatchedDevices($relatedScenes);
		if (count($relatedScenes) == 0)
			return;


		/** we have a list of scenes that requires 'buttonID' as a trigger button
		  * scenes with any device that doesn't match the required status has been removed
		  * remove scenes that doesn't match 'time of day'
         **/  
		$relatedScenes = removeScenesWithUnmatchedTimeofday($relatedScenes);
		if (count($relatedScenes) == 0)
			return;

		/** this function was started by a device power change
		 ** remove now all scenes that requires a RF button start and the device
		 ** the scene is not going to run if a button is required
		 ** scenes requiring RF button will start from startSceneByButton
		 **/
		$relatedScenes = removeScenesWithButtonTrigger($relatedScenes);
		if (count($relatedScenes) == 0) {
			// this is normal, the scene detected has two triggers and one of them is a device change
			// that has been detected. Nothing to do
			// echo "-- scene not started by device, RF button is required\n";
			return;
		}
		// test time of day
		forkToRunScenes($relatedScenes);
	}

	/** test if a button has been pressed
     ** and test if this button is a trigger for scene start
	 **/
	function startSceneByButton($topic, $msg) {
		global $db;
		global $scenes;

		/** catch button pressed message
		  * Topic: tele/tasmota_B2E42C/RESULT
		  * Msg: {"Time":"2025-05-12T17:03:12","RfReceived":{"Sync":10010,"Low":340,"High":1020,"Data":"7A5E68","RfKey":"None"}}
		  */
		if (!(strstr($msg, '"RfReceived"')!==false && strstr($msg, '"Data":')!==false)) {
			return ;
		}

		// get button ID
		$s = strstr($msg, '"Data":');
		preg_match('/"Data":"([^"]+)"/', $s, $matches);
		if (!isset($matches[1])) {
			return ;	// error
		}

	    $buttonID = $matches[1];
		if (($buttonName = searchButton($buttonID)) == false) {
			return;
		}

		/** we have a button pressed
		  * buttonID, buttonName
		  * look for a scene that requires this button as a trigger
		  */
		$relatedScenes = getScenesWithButtonTrigger($buttonID);
		if (count($relatedScenes) == 0) 
			return;

		// we have a list of scenes that requires 'buttonID' as a trigger button
		// remove from 'relatedScenes' any scene with a device does not matches deviceState (on/off)

		$relatedScenes = removeScenesWithUnmatchedDevices($relatedScenes);
		if (count($relatedScenes) == 0) 
			return;

		/** we have a list of scenes that requires 'buttonID' as a trigger button
		  * scenes with any device that doesn't match the required status has been removed
		  * remove scenes that doesn't match 'time of day'
         **/  

		$relatedScenes = removeScenesWithUnmatchedTimeofday($relatedScenes);
		if (count($relatedScenes) == 0) 
			return;

		// execute scenes listed in 'relatedScenes'
		forkToRunScenes($relatedScenes);
    }

	// remove from 'relatedScenes' any scene with a device does not matches the required on/off state
	function removeScenesWithUnmatchedDevices($relatedScenes) {
		global $scenes;
		global $devicePower;

		$newRelatedScenes = $relatedScenes;
		foreach ($relatedScenes as $sceneIndex => $sceneName) {
			$triggersArray = $scenes[$sceneName]["triggers"];
			for ($i=0; $i<count($triggersArray); $i++) {
				$triggerData = $triggersArray[$i];
				if ($triggerData['action'] == 'device') {

					// check if deviceState "on/off" matches for this device

					$device = $triggerData['device'];	// tasmota_E2F9CB:switch_1
					$powerRequired = $triggerData['deviceState'];
					$multiSwitchDevice = '';
					$powerIndex = getDevicePowerSwitchIndex($device,$multiSwitchDevice);
					if ($powerIndex > 0)
						$device = $multiSwitchDevice;

					if ($devicePower[$device][$powerIndex] !== $powerRequired) {
						unset($newRelatedScenes[$sceneIndex]);
					}
				}
			}
		}
		return $newRelatedScenes;
	}


?>