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
		this.ignoreMQTT = false;
		this.arrayDevs = {};
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
		this.arrayDevs.forEach(dev => {
			this.mqttClient.getStatus(dev.device, '0');
		});
	}

	createTable(nameText, addImgTD = false) {
		const devList = $("device-list");
		const table = createElem("table", { id: 'table_devices' });
		const thead = createElem("thead");
		let tr, img;

		tr = createElem("tr");
		if (addImgTD)
			tr.appendChild(createElem("th"));
		
		const devTH = createElem("th", { text: "Device", style: { "text-align": "left" }});
		if (!addImgTD) {
			img = createElem("img", { id: 'order_by_device', title: "Order by Device", src: "img/down.png", 
									  style: { "margin-left": "4px", "vertical-align": "middle", cursor: "pointer" }});
			devTH.appendChild(img);
		}
		tr.appendChild(devTH);

		const nameTH = createElem("th", { text: nameText, style: { "text-align": "left"}});
		if (!addImgTD) {
			img = createElem("img", { id: 'order_by_name', title: "Order by Name", src: "img/down.png", 
								  style: { "margin-left": "4px", "vertical-align": "middle", cursor: "pointer" }});
			nameTH.appendChild(img);
		}
		tr.appendChild(nameTH);

		const ipTH = createElem("th", { text: "IP Address", style: { "text-align": "left" }})
		if (!addImgTD) {
			img = createElem("img", { id: 'order_by_ip', title: "Order by IP Address", src: "img/down.png", 
								  	style: { "margin-left": "4px", "vertical-align": "middle", cursor: "pointer" }});
			ipTH.appendChild(img);
		}
		tr.appendChild(ipTH);
		table.appendChild(tr);
		devList.appendChild(table);
	}

	// show devices
	mapDevices(showExistingIP = false) {
		if (!devices)
			return ;

		let tr, th;
		this.createTable('Name');
		const table = $('table_devices');

		this.arrayDevs.forEach(dev => {
			tr = createElem("tr");
			const d = dev.device.split("_");
			tr.appendChild(createElem("td", { text: d[1] }));
			const lnk = createElem("a", { text: devices[dev.device]["FriendlyName"], href: `config_tasmota.php?device=${dev.device}` })
			const td = createElem("td");
			td.appendChild(lnk);
			tr.appendChild(td);
			if (showExistingIP)
				tr.appendChild(createElem("td", { text: dev.ip, style: { "text-align": "right", "font-family": "monospace", "font-size": "1rem" }}));
			else
				tr.appendChild(createElem("td", { id: `ip_${dev.device}`, style: { "text-align": "right", "font-family": "monospace", "font-size": "1rem" }}));
			table.appendChild(tr);
  		});
		$("total-devices").innerHTML = 'Total devices: ' + this.arrayDevs.length;
	}

	ipToNumber(ip) {
  		return ip.split('.')
           .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
	}

	orderByIPAddress() {
		this.arrayDevs.sort((a, b) => {
  			if (!a.ip) return 1; 
  			if (!b.ip) return -1;
  			return this.ipToNumber(a.ip) - this.ipToNumber(b.ip);
		});

		$("device-list").innerHTML = "";
		this.mapDevices(true);
	}

	orderByDevice() {
		this.arrayDevs.sort((a, b) => {
  			if (!a.device) return 1; 
  			if (!b.device) return -1;
  			return a.device > b.device;
		});
		$("device-list").innerHTML = "";
		this.mapDevices(true);
	}

	orderByName() {
		this.arrayDevs.sort((a, b) => {
			return devices[a.device]["FriendlyName"] > devices[b.device]["FriendlyName"];
		});
		$("device-list").innerHTML = "";
		this.mapDevices(true);
	}


	mqttParseStatMessage(topic, message, dev, statType) {
		if (this.ignoreMQTT)
			return;
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

	// set mqtt server address
	// will call php, could not set from here because cors
	async configMQTT(ip) {
		if (!await showConfirm("Setup MQTT address for this device?", "Devices Map"))
			return ;
		let url = `/php/set_tasmota_mqtt.php?ip=${ip}`;
		const ret = await get_url_content(url);
		showMessage("Device MQTT server configured", "Devices Map");
	}

	// set device gata retrieved from mqtt
	getDevconfNetwork(dev, devconf) {
		const ipaddress = devconf['StatusNET']["IPAddress"];
		$(`ip_${dev}`).innerHTML = ipaddress;
		// store ip address into arrayDevs
		const devObj = this.arrayDevs.find(obj => obj.device === dev);
		if (devObj)
  			devObj.ip = ipaddress;
	}

	// get tasmota devices from network connection
	// get_tasmota_list.php will query all existing devices looking for tasmota
	// answer at port 80
	getTasmotaList() {

		$("device-list").innerHTML = messageWithImage("Searching for active devices", "img/spinner.gif", "wait_spinner", "Waiting");
		$("total-devices").innerHTML = "";
		$("help_mqtt_color").style.display = 'none';

		this.ignoreMQTT = true;
		fetch(`php/get_tasmota_list.php?from=${server_from}&to=${server_to}`)
  		.then(result => result.json())
  		.then(data => {
			let totDevs = 0;
			let noConfiguredDevices = false;
			let td;

			$("device-list").innerHTML = "";
			this.createTable('Tasmota Name', true);
			const table = $('table_devices');
			data.forEach(dev => {
				++totDevs;
				const tr = createElem("tr");
				const d = dev.device.split("_");

				if (dev.mqttHost === '') {
					td = createElem("td");
					const img = createElem("img", { src: "img/config_mqtt.png", title: "Configure Device MQTT", style: { width: "16px", cursor: "pointer" }});
					img.onclick = () => {
						this.configMQTT(dev.ip);
					};
					td.appendChild(img);
					tr.appendChild(td);
					
					noConfiguredDevices = true;
					tr.appendChild(createElem("td", { text: d[1], style: { cursor: "pointer", "background-color": "#cceeff", title: "Not connected to MQTT" } }));
				}
				else {
					tr.appendChild(createElem("td"));
					tr.appendChild(createElem("td", { text: d[1]  }));
				}
				tr.appendChild(createElem("td", { text: dev.friendlyName }));
				tr.appendChild(createElem("td", { text: dev.ip, style: { "text-align": "right", "font-family": "monospace", "font-size": "1rem" }}));
				table.appendChild(tr);
	  		});
			$("total-devices").innerHTML = 'Active devices: ' + totDevs;
			if (noConfiguredDevices)
				$("help_mqtt_color").style.display = 'block';
		})
  		.catch(error => {
			$("device-list").innerHTML = "Could not retrieve data: <br>" + error;
    		console.error('Fetch error:', error);
  		});
	}

	startMqttConnection() {	 
	    this.mqttClient.mqttConnect();
	}

	startPage() {
		this.arrayDevs = Object.keys(devices).map(dev => ({ device: dev }));
		this.startMqttConnection();
		mapDevices.mapDevices();
	}

	setupNavigation() {
		$('net-search')?.addEventListener("click", () => this.getTasmotaList());
	}
};

function startPage() {
	mapDevices.startPage();
}

document.addEventListener("DOMContentLoaded", function() {
	mapDevices = new mapDevicesClass();
	mapDevices.setupNavigation();
});

document.addEventListener("click", function(event) {
  const target = event.target;
  if (target.id === "order_by_ip") {
		mapDevices.orderByIPAddress();
  } else if (target.id === "order_by_device") {
		mapDevices.orderByDevice(); 
  } else if (target.id === "order_by_name") {
		mapDevices.orderByName();
  }
});