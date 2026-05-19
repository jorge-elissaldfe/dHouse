// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let notify;

class notifyClass {

	mqttClient = null;
	notifyData = {};
	notifyTypes = [
		{ key: 'Online',   switchId: 'online_switch',  textId: 'online_text' },
		{ key: 'Offline',  switchId: 'offline_switch', textId: 'offline_text' },
		{ key: 'ON',  	   switchId: 'poweron_switch', textId: 'power_on' },
		{ key: 'OFF', 	   switchId: 'poweroff_switch', textId: 'power_off' },
		{ key: 'TimeBased',switchId: 'time_based_switch', textId: null }
	];

	constructor() {
		this.mqttClient = new mqttTasmota();
		this.startUserData();
	}

	async startUserData() {
		const data = await this.loadNotify();
		if (data!=="") 
			this.notifyData = JSON.parse(data);
		this.fillCurrentDevice();
		this.fillTimeBased();
	}	

	fillCurrentDevice() {
		this.notifyTypes.forEach(({ key, switchId, textId }) => {
			const config = this.notifyData[device]?.[key] ?? {};
			$(switchId).checked = config.enable === 'yes';
			if (textId != null)
				$(textId).value = config.message ?? '';
		});
	}

	fillTimeBased() {
		// console.log(device);
		//console.log (this.notifyData[device]?.["from_hour"]);

		if (this.notifyData[device]?.["from_hour"])
			$("from_time_based_hour").value = this.notifyData[device]["from_hour"];
		if (this.notifyData[device]?.["from_min"])
			$("from_time_based_min").value = this.notifyData[device]["from_min"];
		if (this.notifyData[device]?.["to_hour"])
			$("to_time_based_hour").value = this.notifyData[device]["to_hour"];
		if (this.notifyData[device]?.["to_min"])
			$("to_time_based_min").value = this.notifyData[device]["to_min"];
	}

	async loadNotify() {
		try {
    		const response = await fetch(`config/notify.config?nocache=${Date.now()}`);
    		if (!response.ok) {
				return "";
	   		}
	   		const data = await response.text();
	   		return data;
  		} 
		catch (error) {
   			return ""; 
		}
	}

	async sendTestMessage() {
		// get messages to send
		let jsonArray = {};
		this.notifyTypes.forEach(({ key, switchId, textId }) => {
	  		if (textId!=null && $(switchId).checked) {
				console.log ("checked: " + switchId + " text: " + textId);
    			jsonArray[key.toLowerCase()] = $(textId).value;
  			}
		});

		const cmd = JSON.stringify(jsonArray);
		console.log (cmd);

		if (cmd == '{}') {
			showMessage("Select the notifications to send.\nClick over the checkbox notifications you want to send.", "Test notifications");
			return;
		}
		if (!await showConfirm("Send test message?"))
			return;
		this.mqttClient.sendDHouseCommand(CMD_TEST_MESSAGE,cmd);
	}

	onButtonClose() {
		go_url(`control_device.php?device=${device}`);
	}

	async saveDevice() {
		this.notifyData[device] = {};
		['Online', 'Offline', 'ON', 'OFF','TimeBased'].forEach(key => {
			this.notifyData[device][key] = {};
		});

		this.notifyData[device] = {};
		this.notifyTypes.forEach(({ key, switchId, textId }) => {
			if (!this.notifyData[device][key]) 
				this.notifyData[device][key] = {};
  			this.notifyData[device][key]["enable"] = $(switchId).checked ? "yes" : "no";
			if (textId)
  				this.notifyData[device][key]["message"] = $(textId).value;
		});

		// time based options
		this.notifyData[device]["from_hour"] = $("from_time_based_hour").value;
		this.notifyData[device]["from_min"] = $("from_time_based_min").value;
		this.notifyData[device]["to_hour"] = $("to_time_based_hour").value;
		this.notifyData[device]["to_min"] = $("to_time_based_min").value;

		const result = await storeNotifyInServer(this.notifyData);
		if (result != 'store: done') 
			showMessage (result,"Notifications");
		else {
			// reload service configuration to update notifications
			reload_dHouseService(this.mqttClient);
			showMessage ("Successfully saved","Notifications");
		}
	}

	startMqttConnection() {
		this.mqttClient.mqttConnect();
	}

	setupNavigation() {
		$('test-image')?.addEventListener("click", () => this.sendTestMessage());
		$('save-button')?.addEventListener("click", () => this.saveDevice());
		$('close-button')?.addEventListener("click", () => this.onButtonClose());
	}

	setupTimeBased() {
		let from = $("from_time_based");
		let to = $("to_time_based");
		let sendNotification = false;

		$('time_based_switch').checked = sendNotification;
  		from.appendChild(createSelect("from_time_based_hour", 40, 0, 23, "h", 0));
		from.appendChild(document.createTextNode(":"));
		from.appendChild(createSelect("from_time_based_min", 45, 0, 59, "m", 0));
  		to.appendChild(createSelect("to_time_based_hour", 40, 0, 23, "h", 0));
		to.appendChild(document.createTextNode(":"));
		to.appendChild(createSelect("to_time_based_min", 45, 0, 59, "m", 0));
	}
};

// called from init_page after configuration is retrieved
function startPage() {
	$("main_title").innerHTML = config.dHouse.devices[device]?.FriendlyName ?? device;
	notify.startMqttConnection();
	notify.setupTimeBased();
}

document.addEventListener("DOMContentLoaded", async function() {
	notify = new notifyClass();
	notify.setupNavigation();
});

