// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let upgradeTasmota;

class upgradeTasmotaClass {

	updatingDevice = false;
	deviceRestarted = false;
	upgradeDone = false;
	mqttClient = null;

	constructor() {
		this.mqttClient = new mqttTasmota();
		this.setMqttCallbacks();
	}

	setMqttCallbacks() {
		const handlers = [
			[mqttTasmota.CONNECTION_SUCCESS, this.mqttConnectionSuccess],
			[mqttTasmota.STAT_MESSAGE, this.mqttParseStatMessage],
			[mqttTasmota.TELE_MESSAGE, this.mqttParseTeleMessage],
		];
		handlers.forEach(([topic, handler]) => {
  			this.mqttClient.callbackSubscribe(topic, handler.bind(this));
		});
	}

	// perform upgrade
	upgradeDevice() {
		if (this.updatingDevice)
			return;
		$("upgrade-message").innerHTML = "\
		<br>\
		<table>\
		<tr><td><img width='22px' src='img/spinner.gif'></td>\
		<td>Upgrading Firmware ... </td>\
		</tr>\
		</table>";
		$("go-button").style.display="none";

		this.mqttClient.publish('cmnd/'+device+'/OtaUrl', TASMOTA_CURRENT_RELEASE);
		this.mqttClient.publish('cmnd/'+device+'/OtaUrl', '');
		this.mqttClient.publish('cmnd/'+device+'/Upgrade', '1');
		this.updatingDevice = true;

		// now wait for this msg: 
		// message, topic: tele/tasmota_C38D64/LWT message: Online 
	}


	// callback called from mqtt_tasmota 
	// parse_mqtt_stat_message(topic, message, device, statType)
	mqttParseStatMessage(topic, message, dev, statType) {
 		if (dev != device)
	    	return;

		if (statType == "LOGGING" && message.includes("LWT = Online")) {
			// topic: stat/tasmota_B2E42C/LOGGING 
			// message: 12:09:36.487 MQT: tele/tasmota_B2E42C/LWT = Online (retained) mqtt_tasmota.js:98:13
			this.onDeviceOnline(dev, true);
			return;
		}

		let obj = "";
		try {
			obj = JSON.parse(message);
		} catch (e) {
			return ;
		}

  		switch (statType) {	
			case 'STATUS2':
				// get current firmware version
				// display new firmware, enable 'go' button
      			if (obj["StatusFWR"]["Version"] != null) {
					const currentFirmware = obj["StatusFWR"]["Version"]
					$("current_firmware").innerHTML = currentFirmware;
					if (!forceUpgrade && newFirmware == currentFirmware.substr(0,newFirmware.length))  {
						$('upgrade-message').innerHTML = "- No new version is available -";
						$("close-button-div").style.display="block";
					}
					else
						if (!this.updatingDevice)
							$("go-button").style.display = "block";
				}
				break;
			case "UPGRADE":
				// get successfully updated
				if (obj.hasOwnProperty("Upgrade") && obj.Upgrade.startsWith("Successful")) {
					$('upgrade-message').innerHTML = "\
					<table>\
					<tr>\
						<td><img width='22px' src='img/spinner.gif'></td>\
						<td>Firmware successfully installed.<br>Restarting ... </td>\
					</tr>\
					</table>";
					this.deviceRestarted = true;
				}
      			break;
  		}
	}

	onDeviceOnline(dev,online) {
		if (dev !== device)
			return;
		if (!online)
			return;
		if (!this.updatingDevice) {
			return;
		}

		// online received from device after upgrade
		if (!this.deviceRestarted) {
			$("upgrade-message").innerHTML = "\
			<br>\
			<table>\
			<tr>\
				<td><img width='22px' src='img/spinner.gif'></td>\
				<td>Restarting device ... </td>\
			</tr>\
			</table>";
			return;
		}
		if (this.upgradeDone) {
			$('upgrade-message').innerHTML = "- Upgrade finished";
			$("close-button-div").style.display="block";
			return;
		}

		this.upgradeDone = true;
		$('upgrade-message').innerHTML = "- Upgrade done<br>- Device might automatically restart while upgrading<br>";
		$("close-button-div").style.display="block";
	}


	// parse_mqtt_tele_message(topic, message, device, teleType)
	// called from mqtt_tasmota 
	mqttParseTeleMessage (topic, message, dev, teleType) {
		const cmd = teleType.split(' ');
  		switch (cmd[0]) {
			case 'LWT':
				this.onDeviceOnline(dev, (message == 'Online'));
	        	break;
  		}
	}

	// callback from mqtt_tasmota 
	mqttConnectionSuccess() {
		this.mqttClient.getStatus(device, '2');  	// get device firmware version
	}

	startMqttConnection() {	
    	this.mqttClient.mqttConnect();
	}

};

// called from init_page after configuration is retrieved
function startPage() {
	upgradeTasmota.startMqttConnection();
	$("friendly_name").innerHTML = config.dHouse.devices[device]?.FriendlyName ?? '';
}

function setupNavigation() {
	$('button-close')?.addEventListener("click", () => history.go(-1));
}

document.addEventListener("DOMContentLoaded", function() {
	upgradeTasmota = new upgradeTasmotaClass();

	const powerButton = $("upgrade-button");
	powerButton.addEventListener("click", function (event) {
		upgradeTasmota.upgradeDevice();
	});
	setupNavigation();
})

