<?php
	/** dHouse
	  * Tasmota devices manager
	  * Send notifications to cellphone using ntfy application
	  * Jorge Elissalde 2025
    **/

class NotifyClass {

	private $ntfyConfig = [];

 	public function __construct() {
		/* json expected data in ntfy.json file:
		 *
		 * {
  	 	 * 		"user": "username",
  		 * 		"password": "password",
  		 * 		"url": "http://servername.domain:8082/dhouse"
		 * }
 		 */
		if (file_exists(NTFY_FOLDER . "ntfy.json")) {
			$js = file_get_contents(NTFY_FOLDER . "ntfy.json");
			$this->ntfyConfig = json_decode($js, true);
		}
	}

	public function reloadConfiguration() {
	}

	public function sendCellphoneTestMessage($msg) {
		$m = json_decode($msg, true);
		if (isset($m["online"]))
			$this->sendCellphoneNotify("Testing device\n" . $m["online"], "heavy_check_mark");
		if (isset($m["offline"]))
			$this->sendCellphoneNotify("Testing device\n" . $m["offline"], "no_entry");
		if (isset($m["on"]))
			$this->sendCellphoneNotify("Testing device\n" . $m["on"]);
		if (isset($m["off"]))
			$this->sendCellphoneNotify("Testing device\n" . $m["off"]);
	}

	// notify user cellphone if notification is active for this device switch change
	public function notifyCellphoneUserSwitch($device, $friendlyName, $powerStatus, $powerSwitch, $source) {
		global $cellphoneNotify;
		global $config;

		if (!isset($cellphoneNotify[$device][$powerStatus]["enable"]) || 
				   $cellphoneNotify[$device][$powerStatus]["enable"] == "no")
			return;

		$userMessage = $cellphoneNotify[$device][$powerStatus]["message"];
		$notify = $friendlyName;

		if ($powerSwitch > 0) {
			// append switch name
			$switchID = "switch_$powerSwitch";
			$switchName = isset($config["dHouse"]["devices"][$device][$switchID]) ? $config["dHouse"]["devices"][$device][$switchID]:$switchID;
			$notify .= " - $switchName";
		}

 		$notify .= "\n$powerStatus $source\n";

		if (!empty($userMessage))
			$notify .= "\n$userMessage";
		$this->sendCellphoneNotify($notify);
	}

	public function sendCellphoneNotify($notify, $tags="") {
		// possible tags: no_entry, warning

		if (!isset($this->ntfyConfig["url"])) {
			echo "* error: ntfyConfig[url] not defined\n";
			return;
		}
		if ($tags!="") {
			$headers = [
    			"X-Tags: $tags",
    			"Content-Type: text/plain"
			];
		}

		$ch = curl_init($this->ntfyConfig['url']);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $notify);
		if ($tags != "")
			curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_USERPWD, "{$this->ntfyConfig['user']}:{$this->ntfyConfig['password']}");

		$response = curl_exec($ch);
		curl_close($ch);
		echo $response;
	}

}

?>