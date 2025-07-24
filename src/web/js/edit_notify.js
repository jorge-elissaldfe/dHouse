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
		{ key: 'OFF', 	   switchId: 'poweroff_switch', textId: 'power_off' }
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
	  		if ($(switchId).checked) {
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

	fillCurrentDevice() {
		this.notifyTypes.forEach(({ key, switchId, textId }) => {
			const config = this.notifyData[device]?.[key] ?? {};
				$(switchId).checked = config.enable === 'yes';
				$(textId).value = config.message ?? '';
		});
	}

	async saveDevice() {
		this.notifyData[device] = {};
		['Online', 'Offline', 'ON', 'OFF'].forEach(key => {
			this.notifyData[device][key] = {};
		});

		this.notifyData[device] = {};
		this.notifyTypes.forEach(({ key, switchId, textId }) => {
			if (!this.notifyData[device][key]) 
					this.notifyData[device][key] = {};
  			this.notifyData[device][key]["enable"] = $(switchId).checked ? "yes" : "no";
  			this.notifyData[device][key]["message"] = $(textId).value;
		});

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
		$('back-image')?.addEventListener("click", () => this.onButtonClose());
		$('test-image')?.addEventListener("click", () => this.sendTestMessage());
		$('save-button')?.addEventListener("click", () => this.saveDevice());
		$('close-button')?.addEventListener("click", () => this.onButtonClose());
	}
};

// called from init_page after configuration is retrieved
function startPage() {
	$("main_title").innerHTML = config.dHouse.devices[device]?.FriendlyName ?? device;
	notify.startMqttConnection();
}

document.addEventListener("DOMContentLoaded", async function() {
	notify = new notifyClass();
	notify.setupNavigation();
});

