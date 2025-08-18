// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

"use strict";

let index;

class indexClass {

	// devices firmware version are stored in memory to be able to check them when
	// version request is sent to the cloud

	devicesFirmware = Array();
	config = {};
	arrangeDevicesSwitch = false;
	userData = {};
	devicesDragAndDrop = null;
	mqttClient = null;
	indexShortcuts = null;

	constructor () {
		this.mqttClient = new mqttTasmota();
		this.setMqttCallbacks();
		this.indexShortcuts = new indexShortcutsClass(this);
	}

	// set callback functions for mqtt
	setMqttCallbacks() {
		const handlers = [
			[mqttTasmota.STAT_MESSAGE, this.mqttParseStatMessage],
			[mqttTasmota.TELE_MESSAGE, this.mqttParseTeleMessage],
			[mqttTasmota.CONNECTION_SUCCESS, this.mqttConnectionSuccess],
			[mqttTasmota.CONNECTION_ERROR, this.mqttConnectionError],
			[mqttTasmota.CONNECTION_OFFLINE, this.mqttConnectionOffline],
			[mqttTasmota.POWER_CHANGE, this.mqttPowerChange],
			[mqttTasmota.DEVICE_OFFLINE, this.mqttDeviceOffline],
			[mqttTasmota.DEVICE_ONLINE, this.mqttDeviceOnline],
			[mqttTasmota.MULTI_POWER_CHANGE, this.mqttMultiPowerChange]
		];
		handlers.forEach(([topic, handler]) => {
  			this.mqttClient.callbackSubscribe(topic, handler.bind(this));
		});
	}

	setDevicesDragAndDrop() {
		this.devicesDragAndDrop = new Sortable($('device-list'), {
   			animation: 150,
			draggable: "[id^='div_container_']",
   			delay: 200, 
   			delayOnTouchOnly: true,
   			touchStartThreshold: 5
		});
	}

	// arrange devices on screen
	arrangeDevices() {
		const dropdown = document.querySelector(".dropdown");
		let ids;

		dropdown.classList.remove("show");
		this.arrangeDevicesSwitch = !this.arrangeDevicesSwitch;	
		
		// if we are going to show the "move" device icons then turn off all 
		// alerts for firmware update and timer running to five more visual space
		ids = document.querySelectorAll('[id$="img_firmware"]');
		ids.forEach(el => {
	    	el.style.display = "none";
		});
		ids = document.querySelectorAll('[id$="img_timer"]');
		ids.forEach(el => {
	    	el.style.display = "none";
		});

		// show or hide "move" image
		ids = document.querySelectorAll('[id^="move_"]');	
		ids.forEach(el => {
    		el.style.display = this.arrangeDevicesSwitch ? "block":"none";
		});
	
		if (this.arrangeDevicesSwitch) {
			$("arrange-devs").src="img/save.png";
			$("arrange-devs").title = "Save";
 			this.setDevicesDragAndDrop();
		}
		else {
			$("arrange-devs").src="img/dots.png";
			$("arrange-devs").title = "Arrange devices";

			// store new order for current user
			const devs = document.querySelectorAll("[id^='div_container_']");
			const userOrder = Array.from(devs).map(el => el.id.replace("div_container_", ""));

			try {
				this.userData = loadUserData()
				.then(data => {
					let dataArray = {};
					if (data !== "")
						dataArray = JSON.parse(data);
					if (!dataArray[dhouse_user])
						dataArray[dhouse_user] = {};
					dataArray[dhouse_user]['device_order'] = userOrder;
					this.userData = dataArray;

					const ret = storeUserInServer(dataArray)
					.then(ret => {
						if (ret !== "store: done")
							showMessage("Could not store user data.<br>Verify [config] folder permissions.","User settings");
					});
				});
			}
			catch (error) {
				console.log (error);
			}
			this.devicesDragAndDrop.destroy();
			this.devicesDragAndDrop = null;
		}
	}

	// get every value for timed power
	parseTimedPower(dev, timedPower) {
		const timerId = `${dev}_img_timer`;
		const timerImage = $(timerId);

		if (timedPower?.TimedPower == "Empty") {
			if (timerImage)
				timerImage.style.display = "none";
			return;
		}

		if (timedPower?.TimedPower && timedPower.TimedPower == "Done")
			return;

		if (Array.isArray(timedPower?.TimedPower)) {
		 	/*
		  	* result of timers for this device:
		  	* TimedPower: Array [ {…}, {…} ]
		  	*		0: Object { Remaining: 2613, Command: "Power1 1" }
		  	*		1: Object { Remaining: 3380, Command: "Power2 0" }
		  	* just a single element will be shown if this is a single power device
		  	*/
			let remaining = 0;
			for (let i=0; i<=timedPower.TimedPower.length; i++) {
				if (timedPower?.TimedPower[i]?.Command) {
					// set what the power change should be waiting for a timer end
					const cmd = timedPower.TimedPower[i].Command.split(" ");	// Power2 1
					const waitingFor = cmd[1];									// 1
					const powerSwitch = cmd[0].slice(5);						// 2
					devices[dev][`switch_i`]= {
	    				timerWaitingFor: waitingFor
					};
					remaining = timedPower.TimedPower[i].Remaining;
				}
			}
			if (timerImage && remaining) 
				timerImage.style.display = "block";
		}
	}

	// parse_mqtt_tele_message(topic, message, device, teleType)
	// called from mqtt_tasmota 
	mqttParseTeleMessage (topic, message, dev, teleType) {
		const cmd = teleType.split(' ');
  		switch (cmd[0]) {
			case 'RESULT':
				let data = "";
				try {
					data = JSON.parse(message);
				}
				catch (e) {
					return;
				}
				const dataValue = data?.RfReceived?.Data;
				if (dataValue)
					this.buttonRfReceived (dev, dataValue);
				break;
  		}
	}

	// bridge received a RF button press
	// blick image on screen just to tell that the button is received
	buttonRfReceived(dev, buttonID) {
		if (!this.searchButtonID(buttonID))
			return;

		// blink bridge image
		const image = $(`img_${dev}`);
		if (!image)
			return;

		image.style.opacity = "0.1";
		setTimeout(() => {
			image.style.opacity = "1";
		}, 300);
	}

	// search for a button id in the configuration bridge buttons
	searchButtonID(buttonID) {
		if (!config?.dHouse?.buttons) 
			return false;

		const buttons = config.dHouse.buttons;
		for (const button of buttons) {
  			const key = Object.keys(button)[0];
  			const name = button[key];
			if (key == buttonID)
				return true;
	  	}
		return false;
	}

	// received from mqttParseTeleMessage
	// detects a new Tasmota device not configured
	onDeviceOnline(dev, online) {
		if (!this.isKnownDevice(dev) && online) {
			this.newDeviceDetected(dev);
    		return;
  		}

		/*
	 	 * store status in devices array
	 	 * the dev could not exist in the list, if it is new or just a testing device
	 	 * these values must be set here, the device could not be visible on
	 	 * screen because user-place select
    	 */
		if (devices && devices[dev]) {
			devices[dev].Enabled = online;
			if (!online)
				devices[dev].PowerOn = false;
		}

		// set div container online / offline
		const divContainer = $(`div_container_${dev}`);
		if (divContainer) {
			const addClass = online ? "section-device" : "section-device-off";
			const removeClass = online ? "section-device-off" : "section-device";
			divContainer.classList.remove(removeClass);
			divContainer.classList.add(addClass);
		}

		// check for Sonoff bridge
		// if (devices[dev] && devices[dev].ModuleType && devices[dev].ModuleType == BRIDGE_MODULE) {
		if (devices && devices[dev]?.ModuleType === BRIDGE_MODULE) {
			this.setBridgeStatus(dev, online);
			return ;
		}

		const iconDev = $(`img_${dev}`);
		if (iconDev) {
	  		iconDev.classList.toggle("image-disabled", !online);
		}

		if (devices && devices[dev]?.PowerControls && devices[dev].PowerControls > 1) {
			// enable/disable slide for multi power switches device
			for (let i=1; i<=devices[dev].PowerControls; i++) {
				const slideName = `slide_${dev}_switch_${i}`;
				const powerSlide = $(slideName);

				if (!powerSlide)
					continue;

				powerSlide.disabled = !online;
				if (!online)
					powerSlide.checked = false;
			}
		}

		// exit if already on the same online status
		// several messages retrieving the online status could be received
		const powerSlide=$(`slide_${dev}`);
		if (!powerSlide)
			return;

		// single power switch device
		// set status line behind device name
		this.setDeviceStatusLine(dev, online, devices[dev].PowerOn);

		if ((online && !powerSlide.disabled) || (!online && powerSlide.disabled))
			return;

		if (online) {	
			powerSlide.disabled = false;
		}
		else {
			powerSlide.checked = false;	
			powerSlide.disabled = true;
		}
	}

	// set status line behind device name
	// for multiple power switches device up to 4 slide power switches will be placed here
	setDeviceStatusLine(dev, online, powerOn) {
		if (devices[dev]?.ModuleType === BRIDGE_MODULE) {
			this.setBridgeStatus(dev, online);
			return ;
		}

		// show status ON/OFF
		const deviceStatus = $(`status_${dev}`);
		if (deviceStatus) {
			if (!online) {
				deviceStatus.innerHTML = "Offline";
				deviceStatus.color = "gray";
				devices[dev].DeviceStatus = "Offline";	// store value for shown again if Place is changed
			}
			else {
				deviceStatus.color = "black";
				if (devices[dev].PowerControls > 1) {
					// show up to 4 switches for this device power switch control
					// deviceStatus.innerHTML = "multi switch";
					devices[dev].DeviceStatus = "";
					return ;
				}
				else {
					// single power switch device
					deviceStatus.innerHTML = (powerOn) ? "ON":"OFF";
					devices[dev].DeviceStatus = (powerOn) ? "ON":"OFF";	// store value for shown again if Place is changed
				}
			}
		}
	}

	// set online status for SonOff Bridge
	setBridgeStatus(dev, online) {
		const iconDev = $(`img_${dev}`);
		if (!iconDev)
			return;
	
		if (online)
			iconDev.classList.remove("image-disabled");
		else
			iconDev.classList.add("image-disabled");
	}

	// called from onDeviceOnline if device not listed in known devices
	newDeviceDetected(dev) {
    	const divNewDevice = $('div_new_device');
    	const newDeviceBox = $('new_device_box');
    	divNewDevice.textContent = `New device found: ${dev} `;

    	const link = createElem("a", { text: "Configure", style: { marginLeft: "10px"}}); 
    	link.href = `config_tasmota.php?device=${dev}`;
    	divNewDevice.appendChild(link);
    	newDeviceBox.style.display = 'block';
	}

	// callback from mqtt_tasmota for multiple control power change
	// this call could be sent for a real switch change or for status query
	mqttMultiPowerChange(dev, powerState, powerSwitch, sender) {
		// store switch power state, required for show it again when place is changed
		if (!devices[dev].PowerSwitch)
			devices[dev].PowerSwitch = [];
		devices[dev].PowerSwitch[powerSwitch] = powerState;

		if (!this.isKnownDevice(dev))
			return;

		const slideName = `slide_${dev}_switch_${powerSwitch}`;
		const slideControl = $(slideName);
		if (!slideControl)
			return;
		slideControl.checked = powerState == 'ON';

		// request timed power to update timer running image
		this.mqttClient.getTimedPower(dev);		
	}

	// sent by mqtt when device power change
	// single power switch device
	// TODO make unique code with mqttMultiPowerChange
	mqttPowerChange(dev, power_on) {	
		if (!this.isKnownDevice(dev))
			return;

		// check if timer icon must be disabled
		if (devices[dev]?.switch_1?.timerWaitingFor) {
			// switch_1 is set for single power switch device 
			const timerWaitingFor = devices[dev].switch_1.timerWaitingFor == 1;
			if (power_on === timerWaitingFor) {
				// disable timer running image
				const timerImage = $(`${dev}_img_timer`);
				if (timerImage)
					timerImage.style.display = "none";
			}
		}
	
		const slide = $(`slide_${dev}`);				// slide could not be available because the user house-place selection
		if (slide)
	  		slide.checked = power_on;

		devices[dev].PowerOn = power_on;			// store power status in devices array
		this.setDeviceStatusLine(dev, true, power_on);	// set status line behind device name
		this.mqttClient.getTimedPower(dev);				// request timed power to update timer running image
	}


	// callback called from mqtt_tasmota 
	// parse_mqtt_stat_message(topic, message, device, statType)
	mqttParseStatMessage(topic, message, dev, statType) {
 		if (!this.isKnownDevice(dev))
	    	return

		let obj = "";
		try {
			obj = JSON.parse(message);
		} catch (e) {
			return ;
		}

  		switch (statType) {	
			case 'STATUS2':
				// get firmware version
      			if (obj["StatusFWR"]["Version"] != null)
					this.onFirmwareVersion(dev, obj["StatusFWR"]["Version"])
      			break
			case 'RESULT':
				if (obj?.TimedPower) 
					this.parseTimedPower(dev, obj); 

				const loadAvg = obj?.LoadAvg;
				if (loadAvg) {
					const loaddiv = $(`loadavg_${dev}`);
					if (loaddiv) 
						loaddiv.innerHTML = loadAvg+"%";
				}
				break;
  		}
	}

	// search for this device in the list of known devices
	isKnownDevice(dev) { 
		if (!devices)
			return false;
		return Object.keys(devices).some(d => d === dev);
	}

	// received on call to getLastTasmotaFirmware
	// store firmware value in php session to avoid more calls to get firmware
	lastTasmotaFirmwareCallback(lastFirmware) {	
		lastTasmotaFirmware = lastFirmware;
		set_php_session(`tasmota_firmware=${lastFirmware}`);
		this.checkAllDevicesFirmware(false, false);
	}

	// received from parse device data
	onFirmwareVersion(dev, firmware) {	
		this.devicesFirmware.push({ "device" : dev, "firmware" : firmware });
		this.checkDeviceFirmware(dev, firmware);
	}

	// called when tasmota last available release is retrieved and also called from menu
	checkAllDevicesFirmware(popupIfNothingNew, openPopupBox) {	
		let update = false;
		for (var dev in this.devicesFirmware) 
			update |= this.checkDeviceFirmware(this.devicesFirmware[dev]["device"], this.devicesFirmware[dev]["firmware"]);

		if (!update && !popupIfNothingNew)
			return;

		if (openPopupBox) {
			const messageBox = $('generic_box');
			messageBox.innerHTML = (update) ? "New Firmware Available: "+lastTasmotaFirmware:"No firmware updates available";
			messageBox.style.display = 'block';
			messageBox.style.backgroundColor = "#FFE082";
			setTimeout(this.hidePopupBox, 20000);
		}
	}

	// hide 'generic_box' popup box
	hidePopupBox() {
		const genBox = $('generic_box')
		genBox.style.display = 'none';
	}

	// check device firmware for older version
	checkDeviceFirmware(dev, firmware) {
		if (lastTasmotaFirmware === '')
			return false;

		if (firmware.substr(0,lastTasmotaFirmware.length) != lastTasmotaFirmware) {
			const imageInfo = $(`${dev}_img_firmware`);
			if (imageInfo != null) {
				imageInfo.style.display="block";
				imageInfo.src = "img/alert.png";
				imageInfo.link = "upgrade_tasmota.php";
				imageInfo.style.width = "20px";
				imageInfo.style.height = "auto";
				imageInfo.setAttribute("title", "New Firmware Available: "+lastTasmotaFirmware);
			}
			return true;
		}
		return false;
	}

	mqttConnectionOffline() {
	}

	mqttDeviceOffline(dev) {
		this.onDeviceOnline(dev, false);
	}

	mqttDeviceOnline(dev) {
		this.onDeviceOnline(dev, true);
	}

	showWaitingSpinner(show) {
		let spinner = $('spinner');
		spinner.src = show ? 'img/spinner.gif':'';
	}

	// callback from mqtt_tasmota 
	mqttConnectionError() {
	}

	/** data functions **/
	resetAllDevicesStatus() {
		if (devices)
    		Object.values(devices).forEach(dev => {
		        Object.assign(dev, { Enabled: false, PowerOn: false });
	    	});
	}

	// show every device
	showDevicesList() {

		// returns array of devices ordered by user criteria
		const getUserDeviceOrder = () => {
			let userDeviceOrder = [];
	
			// build 'userDeviceOrder' array using user defined order
			if (this.userData[dhouse_user] && this.userData[dhouse_user].hasOwnProperty("device_order"))
				userDeviceOrder = this.userData[dhouse_user]["device_order"];
			if (userDeviceOrder.length == 0)
				userDeviceOrder = Object.keys(devices);
			else {
				// add devices that are not listed in deviceOrder
				const allDeviceOrder = Object.keys(devices);
				allDeviceOrder.forEach(dev => {
		  			if (!userDeviceOrder.includes(dev)) {
    					userDeviceOrder.push(dev);
  					}
				});
			}
			return userDeviceOrder;
		}
		
		if (!devices || (devices && Object.keys(devices).length === 0))
			return;

		// devices names, icons and slide button
		const options = [
			{ icon: "timer-blue.png", link: "", title: "Timer running", id: "img_timer", display: "none" },
			{ icon: "alert.png", link: "upgrade_tasmota.php", title: "New Firmware available", id: "img_firmware", display: "none" },
		];

		const selectPlaces = $("select-places");
		const selectedPlace = selectPlaces.value;
		const fragment = document.createDocumentFragment();
		let count = 0;
		
		const userDeviceOrder = getUserDeviceOrder();

		// show devices
		// show all devices if selected or the devices for selected user house-place 
		userDeviceOrder.forEach(dev => {
	
			// skip if we are not going to show unplugged devices and this device is Offline
			if (config?.dHouse?.configuration?.showUnplugged === "hide" && devices[dev]?.DeviceStatus == "Offline") {
				return;
			}

			if (selectedPlace == 'All' || selectedPlace == devices[dev]["Place"]) {
        		const table = this.createDeviceRow(dev, devices[dev], options);
	
				const addClass = !devices[dev]["Enabled"] ? "section-device-off":"section-device"
				const section = createElem("section", { id: `div_container_${dev}`, classlist: addClass, style: { position: 'relative'} });
				section.appendChild(table);

				// add a move position handler
				// not visible until "arrange device" set
				const imgHandle = createElem("img", { id: `move_${dev}`, src: "img/menu.png", 
											style: { width: '18px', 
													position: 'absolute', 
													top: '17px',
													right: '8px',
													cursor: 'pointer',
													display: 'none'
												}
											}
										);

				section.appendChild(imgHandle);

				// add bottom padding to a multiple power switch device 
				// slide buttons are behind the device name
				if (devices[dev].PowerControls > 1)
					section.style.paddingBottom = "18px";

    	    	fragment.appendChild(section);
				++count;
			}
		});
		// table.appendChild(fragment);
	
		const deviceList = $("device-list");
		deviceList.replaceChildren();
		// deviceList.appendChild(table);

		deviceList.appendChild(fragment);
		if (count == 0)
			$("device-list").innerHTML = "<br>&nbsp;This place has no devices assigned.<br><br>";
	}

	// add table row with device data and options icons
	createDeviceRow(dev, deviceData, options) {

		// create left icon for the device
		const createDeviceIcon = () => {
			let img = createElem("img", { 	src: `img/devices/${deviceData["Icon"]}`, 
											id: `img_${dev}`, 
											class: "device-icon", 
											style: { paddingTop: "2px"} });

			if (!devices[dev]["Enabled"])
				img.classList.add("image-disabled");

			img.addEventListener("click", () => {
				if (devices[dev]?.ModuleType === BRIDGE_MODULE) 
					document.location.href = `config_bridge.php?device=${dev}`;
   				else
					document.location.href = `control_device.php?device=${dev}`;
			});
			img.style.cursor = "pointer";
			return img;
		}

		const table = createElem("table");
		const editLink = (devices?.[dev]?.ModuleType && devices[dev].ModuleType == BRIDGE_MODULE)
				    		? `config_bridge.php?device=${dev}` : `control_device.php?device=${dev}`;
		let row = createElem("tr");
		table.appendChild(row);

		// device icon 
    	let cell = row.insertCell();
		cell.style.width="24px";

		if (deviceData["Icon"]) {
			const img = createDeviceIcon();
    		cell.appendChild(img);
		}

		// device name
    	cell = row.insertCell();
		cell.style.width = "252px"; 
		cell.style.cursor = "pointer";
		cell.onclick = function() {
			document.location.href=editLink;
		};

		cell.appendChild(this.createLink(dev,devices[dev]["FriendlyName"],editLink));
		// place slide checkbox only if this device has 1 power switch
		// for multiple power switch devices the status line for this device will show up to 4 power switches
		cell = row.insertCell();	
		cell.style.width='45px';

		if (devices[dev]?.ModuleType == BRIDGE_MODULE) {
			if (this.showLoadAverage()) 
				this.setLoadAverage(dev, cell, "", "4px");
		}
		else {
			if (devices[dev].PowerControls == 1) {
				// multiple power switch devices will be shown on the status line
				cell.appendChild(this.addSliderCheckbox(dev));
			}
		}

		// options icons (timer, new firmware)
		options.forEach(({ icon, link, title, id, display }) => {
			const optionCell = row.insertCell();
			const optionImg = createElem("img", {
				src: `img/${icon}`,
				title: title,
				class: "device-icon",
				style: {
					cursor: "pointer",
					marginTop: "2px"
				}
			});
			optionImg.link = link;		
			if (link !== "")
				optionImg.addEventListener("click", () => {
					document.location.href = `${optionImg.link}?device=${dev}`;
				});
			if (id) 
				optionImg.id = `${dev}_${id}`;
			if (display)
				optionImg.style.display = display;
			optionCell.appendChild(optionImg);
   		});


		if (devices[dev]?.ModuleType === BRIDGE_MODULE) {
			table.appendChild(row);
			return table;
		}

		// device status in second line, below device name
		row = createElem("tr");
		cell = row.insertCell();	// skip icon
		cell.style.width="24px";

		// status div (ON/OFF)
		// values will be set later in setDeviceStatusLine
		// for multiple power switch devices the status line will have up to 4 slides for power switches

		// text div
		cell = row.insertCell();	
		cell.style.width="240px";

		let div = createElem("div", {
			id: `status_${dev}`,
			style: {
				color: "gray",
				fontSize: "12px",
				position: "absolute",
				marginTop: "-12px",
				marginLeft: "4px"
			}
		});

		if (devices[dev].PowerControls > 1) {
			// place up to 4 slides for power switches
			this.placeDeviceMultiPowerSwitches(dev, div);
		}
		else {
			if (devices[dev]?.DeviceStatus)
				div.appendChild(document.createTextNode(devices[dev].DeviceStatus));
			else {
				devices[dev].DeviceStatus = "Offline";
				div.appendChild(document.createTextNode("Offline"));
			}
		}
		cell.appendChild(div);

		if (this.showLoadAverage()) {
			cell = row.insertCell();
			this.setLoadAverage(dev, cell, "-12px");
		}

		table.appendChild(row);
		return table;
	}

	// place up to 4 multi power switches on status line for this device
	placeDeviceMultiPowerSwitches(dev, div) {
		const switchesToPlace = Math.min(4, devices[dev].PowerControls);

		for (let i=0; i<switchesToPlace; i++) {

			let powerState = ""
			if (devices[dev].PowerSwitch)
				powerState = devices[dev].PowerSwitch[i+1] == "ON";

			const label = this.addSliderCheckbox(dev, i+1, powerState);
			// place powerSwitch name as title
			let title = devices[dev][`switch_${i+1}`];

			if (title == undefined)
				title = `Switch ${i+1}`;
			label.title = title;

			label.style.marginRight = "12px";
			label.style.marginTop = "6px";
			div.appendChild(label);
		}
	}

	showLoadAverage() {
		const showAverage = config.dHouse.configuration.showAverage;
		if (showAverage == 'undefined')
			return true;
		return showAverage;
	}

	setLoadAverage(dev, cell, marginTop, marginLeft="") {
		cell.style.textAlign='center';
		const div = createElem("div", { id: `loadavg_${dev}`, title: "Load Average",
										style: { position: "relative", 
												 color:"gray", 
												 fontSize: "10px", 
												 cursor: "pointer" }});
		if (marginTop!='')
			div.style.marginTop ="-12px";
		if (marginLeft!='')
			div.style.marginLeft = marginLeft;
		else
			div.style.marginRight = "4px";
		cell.appendChild(div);
	}

	// link for device name
	// initially disabled until status is received from mqtt
	createLink(dev, name, link) {
		const a = createElem('a');
    	a.appendChild(document.createTextNode(name));
    	a.href = link; 
		a.setAttribute('class', "nolink");
		a.setAttribute("id", `link_name_${dev}`);
		return a;
	}

	// add slider button to turn device on/off 
	// initially disabled, will be enabled when online status received 
	addSliderCheckbox(dev, powerSwitch = 0, powerState = "") {
		const label = createElem("label", { classlist: 'switch'});
		const inputID = powerSwitch == 0 ? `slide_${dev}`:`slide_${dev}_switch_${powerSwitch}`;
		const input = createElem("input", { id: inputID });
		input.setAttribute("type", "checkbox");

		if (!devices[dev].Enabled)
			input.disabled = true;

		if (powerState == "")
			input.checked = devices[dev].PowerOn;
		else
			input.checked = powerState;

		input.setAttribute("name", dev);
		input.addEventListener("click", (event) => {
	    	this.getCheckboxStatus(event.currentTarget);
		});

		label.append(input);
		const span = createElem("span", { class: "slider round"});
		label.append(span);
		return label;
	}

	// slide power on/off has been modified
	getCheckboxStatus(elm) {
		const dev = elm.name;
		const id = elm.id;
		const powerSwitch = id.split("switch_")[1];

		if (powerSwitch == undefined)
			this.mqttClient.setPower(dev, elm.checked ? "on":"off");
		else 
			this.mqttClient.setPower(dev, elm.checked ? "on":"off",powerSwitch);

		// set off timed power just in case it was set
		// TODO: reset only for corresponding powerSwitch
		this.mqttClient.resetTimedPower(dev);
	}

	// set existing places in select
	setSelectPlaces() {
		if (config?.dHouse?.places === undefined)
			return;

		const selectPlaces = $("select-places");
		const places = config.dHouse.places;
		const fragment = document.createDocumentFragment(); 

		places.forEach((place) => {
			const option = createElem("option");
			option.value = place;
			if (place == selected_place)
				option.selected = true;
			option.textContent = place;
			fragment.appendChild(option);
		});
		selectPlaces.appendChild(fragment); 
	}


	// callback from mqtt_tasmota 
	mqttConnectionSuccess() {
		const boxData = $('generic_box_data');
		boxData.innerHTML = "";
		const genBox = $('generic_box')
		genBox.style.display = 'none';

		if (devices !== undefined) {
			// requests are performed in different ways to try to update display asap
			// request first the device status to fast update them 
			Object.keys(devices).forEach(dev => {
				this.mqttClient.getState(dev);			// ON/OFF switch for multiple devices
			});
			// request the rest of the data, long time consuming
			Object.keys(devices).forEach(dev => {
				let backlog = "";
				backlog += "Status ;";
				backlog += "Status 2;";
				backlog += "TimedPower ;";
				this.mqttClient.publish('cmnd/'+dev+'/Backlog',backlog);
			});
		}

		// request all existing devices from dhouse proxy 
		// required to detect new devices not already defined
		this.mqttClient.publish("cmd/dHouse/proxy","DevicesStatus");
	}

	startMqttConnection() {	 
	    this.mqttClient.mqttConnect();
	}

	// load user data to get shortcuts order
	placeShortcuts() {
		if (!this.userData[dhouse_user])
			return;

		let showScenesBar = true;
		if (this.userData[dhouse_user].hasOwnProperty("showScenesBar"))
			showScenesBar = this.userData[dhouse_user]["showScenesBar"];
		if (showScenesBar)
			this.indexShortcuts.loadScenesShortcuts(this.userData);
	}

	setCurrentShowUnplugged() {
		if (config.dHouse.configuration.showUnplugged === "show") {
			$("hide-show-devices").src = "img/hide.png";
			$("hide-show-devices").title = "Hide unplugged devices";
		}
		else {
			$("hide-show-devices").src = "img/show.png";
			$("hide-show-devices").title = "Show unplugged devices";
		}
	}

	// hide/show unplugged devices
	hideShowDevices() {
		if (!config?.dHouse?.configuration)
			return;

		if (!config?.dHouse?.configuration?.showUnplugged) {
			config.dHouse.configuration.showUnplugged = "hide";
		}
		else
			config.dHouse.configuration.showUnplugged= config.dHouse.configuration.showUnplugged === "show" ? "hide":"show";

		this.setCurrentShowUnplugged();
		storeConfigurationInServer();
		this.showDevicesList();
	}

	async getUserSettings() {
		this.userData = {};
		const data = await loadUserData();
		if (data != "")
			this.userData = JSON.parse(data);
	}

	setupNavigation() {
		$('edit-places')?.addEventListener("click", () => go_url("edit_places.php"));
		$('edit-scenes')?.addEventListener("click", () => go_url("edit_scenes.php"));
		$('log-data')?.addEventListener("click", () => go_url("log_data.php"));
		$('arrange-devs')?.addEventListener("click", () => this.arrangeDevices());
		$("hide-show-devices")?.addEventListener("click", () => this.hideShowDevices());

		if (clientIsMobile()) {
			$("edit-places").style.display = "none";		// hide it to get more space in icons bar
			$("hide-show-devices").style.display = "none";	// ""
		}
	}

	async startPage() {
		this.resetAllDevicesStatus();	// set initial value for every device: disabled, power off
		this.setSelectPlaces();			// show existing places in select
		this.startMqttConnection();

		await this.getUserSettings();

		if (config?.dHouse?.configuration?.showUnplugged)
			this.setCurrentShowUnplugged() 

		this.showDevicesList();			// show all devices
		this.placeShortcuts();

		if (lastTasmotaFirmware == '')
			getLastTasmotaFirmware(TASMOTA_LAST_VERSION, this.lastTasmotaFirmwareCallback.bind(this));
	}
}

// called from init_page after configuration is retrieved
async function startPage() {

	if ($("main_title") && config?.dHouse?.configuration?.dhouse_name)
		$("main_title").textContent = config.dHouse.configuration.dhouse_name;

	index.startPage();
}

// place devices list
document.addEventListener("DOMContentLoaded", (event) => { 

	index = new indexClass();
	index.setupNavigation();

	// listener for menu click: update check
	$("check_firmware_version").addEventListener("click", function(event) {
	   	event.preventDefault(); 
	   	index.checkAllDevicesFirmware(true, true);
	});

	// menu icon & dropdown enabled only on click
    const menuButton = $("menu-icon");
    const dropdown = document.querySelector(".dropdown");
	const editPlaces = $("edit-places");
	const selectPlaces = $("select-places");

    menuButton.addEventListener("click", function (event) {
        dropdown.classList.toggle("show");
        event.stopPropagation(); 
    });

 	// click over generic box will close it
 	const genericBox = $("generic_box");
	genericBox.addEventListener("click", function (event) {
		index.hidePopupBox();
	});

    document.addEventListener("click", function (event) {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove("show");
        }
    });

	// select house-places change
	selectPlaces.addEventListener("change", function (event) {
		set_php_session("selected_place="+this.value);
		index.showDevicesList();
	})
	
});
