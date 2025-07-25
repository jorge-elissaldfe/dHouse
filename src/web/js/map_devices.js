// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

"use_strict"

let mapDevices;

class mapDevicesClass {

	mqttClient = null;

	constructor() {
		this.mqttClient = new mqttTasmota();
		this.setMqttCallbacks();
	}

	setMqttCallbacks() {
		const handlers = [
			[mqttTasmota.STAT_MESSAGE, this.mqttParseStatMessage],
			[mqttTasmota.CONNECTION_SUCCESS, this.mqttConnectionSuccess]
		];
		handlers.forEach(([topic, handler]) => {
  			this.mqttClient.callbackSubscribe(topic, handler.bind(this));
		});
	}

	mqttConnectionSuccess() {
		// request status for each device
		const arrayDevs = Object.keys(devices);
		arrayDevs.forEach(dev => {
			this.mqttClient.getStatus(dev, '0');
		});
	}

	map_devices() {
		if (!devices)
			return ;

		let tr, th;

		const devList = $("device-list");
		const table = createElem("table");
		const thead = createElem("thead");

		tr = createElem("tr");
		tr.appendChild(createElem("th", { text: "Device", style: { "text-align": "left" }}));
		tr.appendChild(createElem("th", { text: "Name", style: { "text-align": "left"}}));
//		tr.appendChild(createElem("th", { text: "Hostname", style: { "text-align": "left" }}));
		tr.appendChild(createElem("th", { text: "IP Address", style: { "text-align": "left" }}));
		table.appendChild(tr);
		
		const arrayDevs = Object.keys(devices);
	
		// show devices
		arrayDevs.forEach(dev => {
			tr = createElem("tr");
			const d = dev.split("_");

			tr.appendChild(createElem("td", { text: d[1] }));
			tr.appendChild(createElem("td", { text: devices[dev]["FriendlyName"] }));
//			tr.appendChild(createElem("td", { id: `hostname_${dev}`, style: { "max-width": "190px", overflow: "hidden", "text-overflow": "ellipsis" } }));
			tr.appendChild(createElem("td", { id: `ip_${dev}`, style: { "text-align": "right", "font-family": "monospace", "font-size": "1rem" }}));
			table.appendChild(tr);
  		});
		devList.appendChild(table);
		$("total-devices").innerHTML = arrayDevs.length;
	}

	mqttParseStatMessage(topic, message, dev, statType) {
		if (message == null)
	    	return;
		if (message == "{\"Command\":\"Unknown\"}")
			return;

		let devconf = null;
		try {    
			devconf = JSON.parse(message);
		}
		catch (error) {
			return;
		}
		if (devconf == null)
			return ;

	    switch (statType) {
    		case 'STATUS5':
	    		this.getDevconfNetwork(dev, devconf);
    			break;
			case 'STATUS':
				// const id = `host_${dev}`;
				// $(id).innerHTML = devconf['Status']['FriendlyName'][0];
				break;

		}
	}

	getDevconfNetwork(dev, devconf) {

		const ipaddress = devconf['StatusNET']["IPAddress"];
		// const hostname = devconf['StatusNET']["Hostname"];
		// $(`hostname_${dev}`).innerHTML = `<a href=config_tasmota.php?device=${dev}>${hostname}</a>`;
		$(`ip_${dev}`).innerHTML = ipaddress;
	}

	startMqttConnection() {	 
	    this.mqttClient.mqttConnect();
	}

	startPage() {
		this.startMqttConnection();
		mapDevices.map_devices();
	}

	setupNavigation() {
		$('back-image')?.addEventListener("click", () => go_url("index.php"));
	}

};

function startPage() {
	mapDevices.startPage();
}

document.addEventListener("DOMContentLoaded", function() {
	mapDevices = new mapDevicesClass();
	mapDevices.setupNavigation();
});
