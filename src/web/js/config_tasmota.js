// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

"use strict"

let configTasmota;

class configTasmotaClass {

	NOTICE_IMAGE = "<img src='img/caution.png' width='12px'>&nbsp;";	// notice yellow triangle image
	powerSwitches = 0;
	modal = null;
	selectedNameSpan = null;
	selected = null;
	deviceOffline = false;	// avoid reentrance after device restart
	deviceInfo = {};		// device vars, latitude, longitude, timezone, etc.
	fillMultiSwitchAlreadyDone = false;	// avoid code reentrance when browser multi tab connection are used
	mqttClient = null;

	constructor () {
		this.mqttClient = new mqttTasmota();
		this.setMqttCallbacks();
	}

	setMqttCallbacks() {
		const handlers = [
  			[mqttTasmota.STAT_MESSAGE, this.mqttParseStatMessage],
  			[mqttTasmota.TELE_MESSAGE, this.mqttParseTeleMessage],
  			[mqttTasmota.DEVICE_OFFLINE, this.mqttDeviceOffline],
  			[mqttTasmota.DEVICE_ONLINE, this.mqttDeviceOnline],
  			[mqttTasmota.MULTI_POWER_SWITCHES, this.mqttMultiPowerSwitches],
  			[mqttTasmota.CONNECTION_SUCCESS, this.mqttConnectionSuccess],
  			[mqttTasmota.MULTI_POWER_CHANGE, this.mqttMultiPowerChange]
		];
		handlers.forEach(([topic, handler]) => {
  			this.mqttClient.callbackSubscribe(topic, handler.bind(this));
		});
	}

	mqttDeviceOnline(dev) {
		if (dev != device)
			return;
		$("install-section").style.display = "block";
	}

	mqttDeviceOffline(dev) {
		if (dev !== device)
			return;
	
		let friendlyName = devices[dev]?.FriendlyName ?? dev;
		$("config_div_text").innerHTML = messageWithImage(`Device <b>${friendlyName}</b> is offline`, "img/refresh.png", "refresh_img", "Refresh") + "<br>";
		const refreshImg = $("refresh_img");
		refreshImg.onclick = function() {
			location.reload(true);
		}
		this.deviceOffline = true;
		$("install-section").style.display = "block";
	}

	mqttMultiPowerSwitches(dev, powerSwitchCount) {
		if (dev != device)
			return;

		// the device could not exists if it is a new one 
		if (devices?.[dev] && powerSwitchCount != config.dHouse.devices[dev]?.PowerControls) {
			// a change in the powerSwitchCount could happens if device template has been changed and
			// new power switches has been detected
			devices[dev].PowerControls = powerSwitchCount;
			storeConfigurationInServer();
		}

		this.powerSwitches = powerSwitchCount;
		if (this.powerSwitches > 1)
			this.fillMultiSwitchDevice();
	}

	/* pulse time conversion
 	* tasmota commands excerpt:
 	* 		1..111 = set PulseTime for Relay<x> in 0.1 second increments
 	* 		112..64900 = set PulseTime for Relay<x>, offset by 100, in 1 second increments.
 	* 		Add 100 to desired interval in seconds, e.g., PulseTime 113 = 13 seconds and PulseTime 460 = 6 minutes (i.e., 360 seconds)
	*/
	hmsToPulseTime(hour, min, sec) {
    	const totalSeconds = hour * 3600 + min * 60 + sec;

    	if (totalSeconds <= 11) {
	        return Math.round(totalSeconds * 10);
	    } else {
        	return Math.round(totalSeconds) + 100;
    	}
	}

	// pulse time convertion
	pulseTimeToHMS(pulseTime) {
    	let totalSeconds = 0;

	    if (pulseTime >= 1 && pulseTime <= 111) {
        	totalSeconds = pulseTime / 10;	
    	} else if (pulseTime >= 112 && pulseTime <= 64900) {
	        totalSeconds = pulseTime - 100;
	    } else {
			return { hour: 0, min: 0, sec: 0 };
    	}

	    const hour = Math.trunc(totalSeconds / 3600);
	    totalSeconds -= hour * 3600;
	    const min = Math.trunc(totalSeconds / 60);
	    totalSeconds -= min * 60;
    	const sec = Math.trunc(totalSeconds);
    	return { hour, min, sec };
	}

	async saveDevice() {	
		let storeServerConfiguration = false;
		let newTemplate = clientIsMobile() ? $("template_mobile")?.value.trim():$("template_not_mobile")?.value.trim();
		const selectModule = $('module_type');
		const moduleNewType = selectModule.options[selectModule.selectedIndex].text;
		const moduleNewIndex = selectModule.value;
		let backlog = "";
		let saveHostname = false;

		if (!config.dHouse.devices?.[device]) {
			if (!config.dHouse.devices) {
				config.dHouse.devices = {};
				devices = config.dHouse.devices;
			}
			config.dHouse.devices[device] = {};
		}

		if (set_template && this.deviceInfo['template'] != newTemplate) 
			if (!await showConfirm("Template changes may cause the device to restart<br>Do you want to proceed?","Template modification"))
				return;

		if (this.deviceInfo['module_type'] != moduleNewType)
			if (!await showConfirm("Module type change will cause the device to restart<br>Do you want to proceed?","Module modification"))
				return;

		const friendlyNameValue = $('friendly_name').value;
		const currentFName = config.dHouse.devices[device]?.FriendlyName;

		if (config.dHouse.configuration.setHostname && currentFName !== friendlyNameValue) {
			if (!await showConfirm("Changing Device Name (will be also set Hostname) will cause the device to restart<brDo you want to proceed?","Module modification"))
				return;
			saveHostname = true;
    		config.dHouse.devices[device].FriendlyName = friendlyNameValue;
    		storeServerConfiguration = true;
		}

		const iconInputValue = $('icon').value;
		const currentIcon = config.dHouse.devices[device]?.Icon;
		if (currentIcon !== iconInputValue) {
	    	config.dHouse.devices[device].Icon = iconInputValue;
    		storeServerConfiguration = true;
		}
	
		if (moduleNewType != devices[device]?.ModuleType) {
			devices[device].ModuleType = moduleNewType;
    		storeServerConfiguration = true;
			// PowerControls must be set again when device restart after setting a new module
			delete devices[device].PowerControls;
		}
		
		if (this.powerSwitches > 1 && devices[device]?.ModuleType !== BRIDGE_MODULE) {
			// get every power switch name
			for (let i=1; i<=this.powerSwitches; i++) {
				const switchName = `switch_${i}`;
				const switchData = $(switchName).value;
				const currentName = config.dHouse.devices[device]?.[switchName];
				if (switchData !== currentName) {
					config.dHouse.devices[device][switchName] = switchData;
					storeServerConfiguration = true;
				}
			}
		}
	
		if (set_sleep_time)
			this.mqttClient.publish('cmnd/'+device+'/Sleep',sleep_time);

		if (!(devices[device]?.ModuleType === BRIDGE_MODULE)) {
			// save all existing pulse time (one for each power switch)
			for (let i=1; i<=this.powerSwitches; i++) {
				const h = $(`pulse_time_hour_${i}`).value;
				const m = $(`pulse_time_min_${i}`).value;
				const s = $(`pulse_time_sec_${i}`).value;
				const pulseTime = this.hmsToPulseTime (parseInt(h,10), parseInt(m,10), parseInt(s,10));
				backlog += `PulseTime${i} ` + pulseTime.toString() + ";";
			}
		}

		if (devices[device]?.ModuleType !== BRIDGE_MODULE) {
			if ($("power_on_state")) {
				const powerState = $("power_on_state").value == 'on' ? 1:0;
				backlog += `PowerOnState ${powerState};`;
			}
	
			if (set_button_hold) {
				const buttonHold = $("button_hold").value ;
				backlog += `SetOption32 ${buttonHold};`;
			}
		}
	
		// set button delay value
		// value is the reverse of user option
		// delay = 0 / select = yes
		// not delay = 1 / select = no
		const buttonDelay = $("button_delay").value == "yes" ? 0:1;
		backlog += `setOption13 ${buttonDelay};`;

		const powerLED = $("power_led").value == 'on' ? 1:0;
		backlog += `LedPower ${powerLED};`;
		backlog += "SetOption0 0;"						// setoption0 to 0, avoid storing power state in flash memory
		backlog += "SaveData 5;";						// enable auto save data
		backlog += "Weblog 2;";							// set weblog to 2, not debug info
		backlog += "Mqttlog 3;";						// set mqtt log level to 3, to get info like SRC: pulseTimer, etc. 
													// required by dhouse service to store in the log
		backlog += "Timezone " + this.deviceInfo['timezone'] + ";";
		backlog += "Latitude " + this.deviceInfo['latitude'] + ";";
		backlog += "Longitude " + this.deviceInfo['longitude'] + ";";

		if (set_template && newTemplate != this.deviceInfo['template']) {
			backlog += "Module 0;";						// allow a new tamplate to be used
			backlog += "Template " + newTemplate;
		}

		if (saveHostname) {
			backlog += "Hostname " + friendlyNameValue + ";";
		}

		backlog += "FriendlyName " + friendlyNameValue + ";";

		// modify module type
		// this will cause a device restart
		if (this.deviceInfo['module_type'] != moduleNewType) 
			backlog += "Module " + moduleNewIndex + ";";

		this.mqttClient.publish('cmnd/'+device+'/Backlog',backlog);

		if (storeServerConfiguration) {
			storeConfigurationInServer();
	 		// update service configuration 
			// will update load new name for this device if changed
			reload_dHouseService(this.mqttClient);
		}
		$("main_title").innerHTML = friendlyNameValue;
		showMessage("Configuration saved");
	}

	// show pulse time retrieved from mqtt
	devconfPulseTime(pulseTime, powerSwitch=1) {
		const values = this.pulseTimeToHMS(pulseTime);
		const selectHour = $(`pulse_time_hour_${powerSwitch}`);
		if (selectHour)
			selectHour.value = values.hour;

		const selectMin = $(`pulse_time_min_${powerSwitch}`);
		if (selectMin)
			selectMin.value = values.min;

		const selectSec = $(`pulse_time_sec_${powerSwitch}`);
		if (selectSec)
			selectSec.value = values.sec;
	}

	sleep(ms) {
  		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async wait() {
	//	await sleep(2000);
	}

	mqttParseStatMessage(topic, message, dev, statType) {
		if (message == null || dev !== device)
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
			case 'STATUS1':
				this.getUptime(devconf);
				break;
			case 'STATUS2':
		    	this.devconfVersion(devconf);
    			break;
    		case 'STATUS5':
	    		this.devconfNetwork(devconf);
    			break;
			case 'STATUS7':
	    		this.devconfTime(devconf);	// time, time zone, sunrise, sunset
    			break;
			case 'STATUS':
				if (devconf?.Status?.Power)
					this.devConfPowerSwitches(devconf.Status.Power.length);
	    		this.dev_conf(devconf);		// name & friendly name
				break;
			case 'UPGRADE':
				var r = $('div_firmware_update');
				r.innerHTML = devconf["Upgrade"];
				break;
			case 'RESULT':
				if (devconf["SetOption32"]) {
					this.getButtonHoldTime(devconf);
					return;
				}
				if (devconf["SetOption13"]) {
					this.getButtonDelay(devconf);
					return;
				}
				if (devconf["Modules"]) {
					this.getModulesList(devconf);
					break;
				}
				if (devconf["LedPower1"]) {
					this.placeLedPower (devconf["LedPower1"]);
					break;
				}
				if (devconf["GPIO"]) {
					this.deviceInfo['template'] = message;
					if (set_template) {
						if (clientIsMobile())
							$('template_mobile').value = this.deviceInfo['template'];
						else 
							$('template_not_mobile').value = this.deviceInfo['template'];
					}
					break;
				}
				if (devconf["Latitude"]) {
					this.placeLatitude(devconf);
					break;
				}
				if (devconf["Longitude"]) {
					this.placeLongitude(devconf);
					break;
				}
				if (devconf["Timezone"]) {
					this.placeTimezone(devconf);
					break;
				}
				if (devconf.PulseTime != null)
					this.getPulseTime(devconf.PulseTime);
				else
					if (devconf.Module!=null)
						this.getDeviceModuleType(devconf.Module);

				if (set_sleep_time) {
					const sleepTime = devconf?.Sleep;
					if (sleepTime) {
						const sleepSelect = $("sleep_time");
						if (sleepSelect)
							sleepSelect.value = sleepTime;
					}
				}
				break;
		}
	}

	getButtonDelay(devconf) {
		this.deviceInfo["buttonDelay"] = devconf["SetOption13"];
		// value is the reverse of user option
		// off = delay
		// on = not delay
		if ($("button_delay"))
			$("button_delay").value = devconf["SetOption13"] == "ON" ? "no":"yes";
	}

	getButtonHoldTime(devconf) {
		this.deviceInfo["buttonHoldTime"] = devconf["SetOption32"];
		if ($("button_hold"))
			$("button_hold").value = this.deviceInfo["buttonHoldTime"];
	}

	// get full list of modules understand by the tasmota firmware
	// build 'module_type' select
	getModulesList(devconf) {
		if (this.deviceOffline)
			return;

		const select = $("module_type");
		const modules = devconf["Modules"];

		// show the array ordered by name
		// move to array preserving original index
		const withOriginalIndex = Object.entries(modules).map(([index, name]) => ({
		    originalIndex: index, name
		}));
		// oder by name
		const sorted = withOriginalIndex.sort((a, b) =>
	    	a.name.localeCompare(b.name)
		);

		for (const item of sorted) {
			const option = createElem("option", { value: item.originalIndex, text: item.name });
			if (item.name == this.deviceInfo['module_type'])
				option.selected = true;
  			select.appendChild(option);
		}
	}

	placeLedPower(status) {
		if ($("power_led")) 
			$("power_led").value = (status == 'ON') ? 'on':'off';
	}

	placeLatitude(devconf) {
		this.deviceInfo['latitude'] = devconf["Latitude"] ;
		if ($("latitude")) 
			$("latitude").innerHTML = this.deviceInfo['latitude'];

		if (typeof config !== 'undefined' &&
			config.dHouse.configuration?.latitude && 
			config.dHouse.configuration.latitude !== '' &&
			config.dHouse.configuration.latitude != this.deviceInfo['latitude'])
			if ($("latitude"))
				$("latitude").innerHTML = this.NOTICE_IMAGE + $("latitude").innerHTML;
	}

	placeLongitude(devconf) {
		this.deviceInfo['longitude'] = devconf["Longitude"];
		if ($("longitude"))
			$("longitude").innerHTML = this.deviceInfo['longitude']

		if (typeof config !== 'undefined' &&
			config.dHouse.configuration?.longitude && 
			config.dHouse.configuration.longitude !== '' && 
			config.dHouse.configuration.longitude != this.deviceInfo['longitude'])
			if ($("longitude"))
				$("longitude").innerHTML = this.NOTICE_IMAGE + $("longitude").innerHTML;
	}

	placeTimezone(devconf) {
		this.deviceInfo['timezone'] = devconf["Timezone"];
		if ($('timezone'))
			$("timezone").innerHTML = this.deviceInfo['timezone']

		if ($('timezone') && typeof config !== 'undefined' &&
			config.dHouse.configuration?.timezone && 
			config.dHouse.configuration.timezone !== '' && 
	    	config.dHouse.configuration.timezone != this.deviceInfo['timezone'])
			$("timezone").innerHTML = this.NOTICE_IMAGE + $("timezone").innerHTML;
	}

	getPulseTime(pulseTime) {
		if (!pulseTime.Set) 
			return;
		for (let i=0; i<pulseTime.Set.length && i<this.powerSwitches; i++) 
			this.devconfPulseTime(parseInt(pulseTime.Set[i]),i+1);
	}

	// parse_mqtt_tele_message(topic, message, device, teleType)
	// called from mqtt_tasmota 
	mqttParseTeleMessage (topic, message, dev, teleType) {
		if (dev != device)
			return;
  		const cmd = teleType.split(' ');
  		switch (cmd[0]) {
	  		case 'LWT':
				if (message == 'Offline') {
				    var r = $('config_div_text');
					let friendlyName = devices[dev].FriendlyName ?? dev;
					r.innerHTML = `<br>Device <b>${friendlyName}</b> is offline<br><br>`;
					this.deviceOffline = true;
				}
        	break;
		}
	}

	devConfPowerSwitches(powerSwitchCount) {
		if (typeof devices === 'undefined')
			return;

		if (devices?.[device]?.PowerControls != undefined) {
			// power switch count is already defined
			return ;
		}
		if (!devices?.[device])
			return;
	
		/* store power control information for next usages
	  	 * one value for each power control
	 	 * for two switch will store "00", three switches "000", ...etc
		 */
		if (powerSwitchCount == undefined)
			powerSwitchCount = 1;
		devices[device].PowerControls = powerSwitchCount;
		storeConfigurationInServer();
	}

	getUptime(devconf) {
		if (!devconf?.StatusPRM?.Uptime)
			return;

		const d = devconf.StatusPRM.Uptime.split("T");
		let uptime;

		if (d[0])
			uptime = d[0] + "d " + d[1];
		else
			uptime = devconf.StatusPRM.Uptime;
		this.deviceInfo['uptime'] = uptime;
		if ($("uptime"))
			$("uptime").innerHTML = uptime;
	}

	// get device module type: Sonoff Bridge / Sonoff Basic / etc.
	getDeviceModuleType(module) {
		// store moduleType if not already defined	
		const moduleType = Object.values(module)[0];
		this.deviceInfo['module_type'] = moduleType;
		const moduleTypeString = $("module_type");
		if (moduleTypeString)
			moduleTypeString.innerHTML = moduleType;
	}

	// get tasmota ip address, hostname, etc.
	devconfNetwork(devconf) {
		var r = $('ip_address');
		this.deviceInfo['ip_address'] = devconf['StatusNET']["IPAddress"];
		if (r != null)
			r.innerHTML = devconf['StatusNET']["IPAddress"];

		var r = $('host_name');
		this.deviceInfo['host_name'] = devconf['StatusNET']["Hostname"];
		if (r != null) {
			if (clientIsMobile())
				r.innerHTML = devconf['StatusNET']["Hostname"].substring(0,18);
			else
				r.innerHTML = devconf['StatusNET']["Hostname"];
		}
	}

	// get tasmota version
	devconfVersion(devconf) {
		const deviceVersion = devconf['StatusFWR']["Version"];
		this.deviceInfo['version'] = deviceVersion;
		var r = $('conf_version');
		if (r != null) {
			if (clientIsMobile())
				r.innerHTML = deviceVersion.substring(0,22);
			else
				r.innerHTML = deviceVersion;
		}

		// device could not exist in configuration if it is new
		if (typeof config !== 'undefined' && config.dHouse.devices?.[device] &&
			deviceVersion.substr(0,lastTasmotaFirmware.length) != lastTasmotaFirmware) {
			this.deviceInfo['firmware_update_ready'] = true;
			const updateTD = $('div_firmware_update');
			updateTD.innerHTML = messageWithImage("Firmware update available", "img/alert.png", "firmware_update", "New firmware available");
			const updateImg = $("firmware_update");
			updateImg.onclick = function() {
				go_url(`upgrade_tasmota.php?device=${device}`);
			}
			const section = $('firmware_section');
			section.style.display = 'flex';
			section.style.justifyContent = 'center';
			section.style.alignItems = 'center';
			section.style.gap = '8px';
		}
	}

	// get tasmota device current time & timezone
	devconfTime(devconf) {
		if (this.deviceOffline)
			return;

		const r = $('current_time');
		const f = devconf['StatusTIM']["Local"].split("T");
		let currentTime;

		if (f)
			currentTime = f[0] + " " + f[1];
		else
			currentTime = devconf['StatusTIM']["Local"];
		this.deviceInfo['current_time'] = currentTime;

		if (r != null) {
			r.innerHTML = currentTime;
		}

		if (devconf['StatusTIM']?.['Sunrise'])
			$("sunrise").innerHTML = devconf['StatusTIM']['Sunrise'];
		if (devconf['StatusTIM']?.['Sunset'])
			$("sunset").innerHTML =  devconf['StatusTIM']['Sunset'];
	}

	fillDeviceIcon() {
		const select = $("icon");
		for (var i = 0; i < icons.length; i++) {
			const option = createElem("option");
			option.selected = (icons[i] == icon);
			option.value = icons[i];
			option.name = icons[i];
			if (typeof config !== 'undefined' && config?.dHouse?.devices?.[device]?.Icon)
				option.selected = icons[i] == config.dHouse.devices[device]?.Icon;
			option.textContent = icons[i];
			select.appendChild(option);
		}
	}

	insertAfterLastMultiSwitchRow(newRow, mainElement) {
    	const baseRow = $(mainElement);
    	const tbody = baseRow.parentNode;
    	let current = baseRow;
    	while (current.nextSibling && current.nextSibling.tagName === "TR") {
	        current = current.nextSibling;
	    }
	    tbody.insertBefore(newRow, current.nextSibling);
	}

	fillMultiSwitchDevice() {
		/** if this is a multiple switch device place here the input for each power name
	  	  * and Pulse Time value
	  	  * power controls number was already received on 'multi_power_switches' message
	  	  */
		if (this.fillMultiSwitchAlreadyDone)
			return;	// avoid reentrance for multiple connection
		this.fillMultiSwitchAlreadyDone = true;

		if (this.powerSwitches <= 1) 
			return;

		if ($("single_pulse_time"))
			$("single_pulse_time").style.display = "none";	

		for (let i=0; i<this.powerSwitches; i++) {
			let newRow = createElem("tr");
			let td = newRow.insertCell();
			let switchName = '';

			if (config?.dHouse?.devices)
				switchName = config.dHouse?.devices[device]?.[`switch_${i+1}`] ?? '';
			if (switchName == '')
				switchName = `switch_${i+1}`;
			td.textContent = `Power ${i+1}:`;

			const input = createElem("input", { id: `switch_${i+1}`, value: switchName });
			input.type = 'text';
			input.name=`switch_${i+1}`;
			input.maxlength = 20;
			td = newRow.insertCell();
			td.appendChild(input);

			// circle red or green to tell which switch is setting
			// switch red will be off, green will be on
			const span = createElem("span", { id: `power_status_span_${i+1}` });
			td.appendChild(span);

			this.insertAfterLastMultiSwitchRow(newRow,"multi_switch_device");

			newRow = createElem("tr");
			td = newRow.insertCell();
			td.style.paddingLeft = '25px';
			td.textContent = "Pulse:";
			td = newRow.insertCell();
			this.placeTimeSelect(td, i+1);
			this.insertAfterLastMultiSwitchRow(newRow,"multi_switch_device");
		}
	}

	// for single power device pulse time powerSwitch will be 1
	placeTimeSelect(td, powerSwitch = 1) {
		let selectHour = this.createSelect(`pulse_time_hour_${powerSwitch}`, 0, 23, "h");
		let selectMin = this.createSelect(`pulse_time_min_${powerSwitch}`, 0, 59, "min");
		let selectSec = this.createSelect(`pulse_time_sec_${powerSwitch}`, 0, 59, "sec");

		td.appendChild(selectHour);	
		td.appendChild(document.createTextNode(":"));
		td.appendChild(selectMin);
		td.appendChild(document.createTextNode(":"));
		td.appendChild(selectSec);
	}
  
	// create a generic select between min to max
	// TODO: replace by createSelect.js
	createSelect (id, min, max, unit, defaultValue) {
		const select = createElem("select", { id: id, style: { width: "auto" }});
	    const fragment = document.createDocumentFragment();
	    for (let i = min; i <= max; i++) {
       		const option = createElem("option", { value: i, text: `${i} ${unit}` });
			option.selected =  (i == defaultValue);
       		fragment.appendChild(option);
   		}
   		select.appendChild(fragment);
    	return select;
	}

	// place Pulse time for single power device
	// place Power-on, Pulse time
	fillPowerData() {
		let newRow = "";
		let td = "";
		let option = "";
		let label = "";

		if (typeof devices !== 'undefined' && devices[device]?.ModuleType !== BRIDGE_MODULE) {
			// power on state
			newRow = createElem("tr");
			td = newRow.insertCell();
			label = createElem("label", { for: "power_on_state", text: "Power-on:"});
			td.appendChild(label);
		
			td = newRow.insertCell();
			const powerOnSelect = createElem("select", { id: "power_on_state", style: { width: "auto" }});
			option = createElem("option", { value: "off", text: "Off" });
			powerOnSelect.appendChild(option);
			option = createElem("option", { value: "on", text: "On" });
			powerOnSelect.appendChild(option);
			td.appendChild(powerOnSelect);
			$("power_on_device").parentNode.insertBefore(newRow, $("power_on_device").nextSibling);
		}

		if (typeof devices !== 'undefined' && devices[device]?.ModuleType !== BRIDGE_MODULE && this.powerSwitches == 1) {
			// pulse time for single power device
			// for multiple power device the 'pulse time' is set for each switch behind name
			newRow = createElem("tr", { id: "single_pulse_time" });
			td = newRow.insertCell();
			td.textContent = "Pulse time:";
			td = newRow.insertCell();
			this.placeTimeSelect(td, 1);
			$("power_on_device").parentNode.insertBefore(newRow, $("power_on_device").nextSibling);
		}
	}

	placeTemplateInput() {
		if (!set_template)
			return;

		if (clientIsMobile()) {
			$("template_for_mobile").style.display = "table-row";
			$("template_mobile").value = this.deviceInfo['template'];
		}
		else {
			$("template_not_mobile").style.display = "block";
			$("template_not_mobile").value = this.deviceInfo['template'];
		}
	}

	onButtonClose() {
		let url = `control_device.php?device=${device}`;
		if (devices?.[device]?.ModuleType === BRIDGE_MODULE)
		  	url = `config_bridge.php?device=${device}`;
		go_url(url)
	}

	// get device configuration from device
	// received from mqtt
	dev_conf(devconf) {
		if (this.deviceOffline)
			return;
		if (typeof config === 'undefined')
			return;

		this.deviceInfo['friendly_name'] = devconf['Status']['FriendlyName'][0];

		var   power_on_state = devconf['Status']['PowerOnState'];
		const friendlyName = config?.dHouse?.devices?.[device]?.FriendlyName ?? '';
		const moduleType  = config?.dHouse?.devices?.[device]?.ModuleType ?? '';

		$("friendly_name").value = friendlyName;
		if ($("module_type"))
			$("module_type").value = moduleType;
		if (devices && devices[device]?.ModuleType !== BRIDGE_MODULE) 
			$("power_on_state").value = power_on_state == 1 ? 'on':'off';
		this.show_selected_icon();
	}

	show_selected_icon() {
	   	let r = $('icon');
		let t = "<img width=32 src='img/devices/"+r.value+"'>";
		r = $('icon_view');
		r.innerHTML = t;
	}

	// apply settings default timezone values to this device
	applyDefaultTimezone() {
		if (!config.dHouse.configuration?.latitude ||
			!config.dHouse.configuration?.longitude ||
			!config.dHouse.configuration?.timezone) {
			showMessage("Default values not defined in Settings");
			return;
		}

		this.deviceInfo['latitude'] = config.dHouse.configuration.latitude;
		if ($("latitude"))
			$("latitude").innerHTML = this.deviceInfo['latitude']

		this.deviceInfo['longitude'] = config.dHouse.configuration.longitude;
		if ($("longitude"))
			$("longitude").innerHTML = this.deviceInfo['longitude']

		this.deviceInfo['timezone'] = config.dHouse.configuration.timezone;
		if ($('timezone')) 
			$("timezone").innerHTML = this.deviceInfo['timezone']
		if ($("param_timezone"))
			$("param_timezone").value = this.deviceInfo['timezone']

		showMessage("Default values applied.<br>Latitude and Longitude values might be modified by the device.<br>Click Save to store the values.");
	}

	selectImage() {
    	this.modal.style.display = "block";
	}

	advancedOptions() {
		if (!$("advanced_options"))
			return;
		const cur = $("advanced_options").style.display
		$("advanced_options").style.display= cur == "none" ? "block":"none";
	}

	// remove device
	async removeDevice() {
		if (!await showConfirm("Are you sure you want to remove the device?"))
			return;

		delete config.dHouse.devices[device];
		storeConfigurationInServer()
			.then(result => {
				console.log (result);
				go_url("index.php");
		});
	}

	// show device information in a popup window
	devInfoMessage() {
		if (!$("friendly_name"))
			return ;

		const friendlyName = $("friendly_name").value;
		const {
			ip_address,
			friendly_name, 
			host_name,
			module_type,
			version,
			firmware_update_ready,
			current_time,
			uptime
		} = this.deviceInfo;


		// TODO: replace new firmware by messageLineWithIcon
		let tableRows = `
		<tr><td>IP address:</td><td>${ip_address}</td></tr>
		<tr><td>Friendly Name:</td><td>${friendly_name}</td></tr>
		<tr><td>Hostname:</td><td>${host_name}</td></tr>
		<tr><td>Module:</td><td>${module_type}</td></tr>
		<tr><td>Version:</td>
			<td>${version}</td>
			${firmware_update_ready ? `
				<td>
					<img src="/img/alert.png" title="New Firmware available"
						style="cursor: pointer"
						onclick="go_url('upgrade_tasmota.php?device=${device}')">
				</td>` : ''
			}
		</tr>
		<tr><td>Time:</td><td>${current_time}</td></tr>
		<tr><td>Uptime:</td><td>${uptime}</td></tr>`;

		const table = `<table id="input-data-table" cellpadding="2">${tableRows}</table>`;
		showMessage(table, `Device: ${friendlyName}`);
	}


	// build select for button hold delay
	buildButtonHold() {
		if (devices[device]?.ModuleType === BRIDGE_MODULE) 
			return ;

		const buttonHoldSelect = createSelect ("button_hold",1,100,"","");
		$("button_hold_div").appendChild(buttonHoldSelect);
		$("button_hold_div").innerHTML += " <font size=2>number of 0.1 seconds</font>";
		$("tr_button_hold").style.display = "table-row";
	}

	buildImageSelector() {
		const images = document.querySelectorAll(".gallery img");
		// build image selector
		images.forEach(img => {
	    	img.addEventListener("click", () => {
	        	if (this.selected) 
					selected.classList.remove("selected");
        		img.classList.add("selected");
        		this.selected = img;

				// update icon image
				const r = $('icon_view');
				const t = "<img width=32 src='img/devices/"+img.getAttribute("data-img-name")+"'>";
				r.innerHTML = t;

				// update select
				$('icon').value = img.getAttribute("data-img-name");
	    		this.modal.style.display = "none";
    		});
		});
	}

	mqttMultiPowerChange(dev, powerState, powerSwitch, sender) {
		if (this.deviceOffline)
			return;
		if (dev != device)
			return;

		// modify span right to the Power name to show power state
		const span = $(`power_status_span_${powerSwitch}`);

		span.classList.remove("on", "off");
		span.classList.remove("status-circle");
		span.classList.add("status-circle", powerState == 'ON' ? 'on':'off');
		span.style.marginLeft = "5px";
	}

	mqttConnectionSuccess() {
		// request list of devices status from dhouse proxy
		this.mqttClient.publish("cmd/dHouse/proxy","DevicesStatus");

		// using backlog form commands is slower than sending one by one
		this.mqttClient.getStatus(device, '0');
		if (set_template)
			this.mqttClient.publish('cmnd/'+device+'/Template', '');
	
		this.mqttClient.publish('cmnd/'+device+'/Timezone', '');	
		this.mqttClient.publish('cmnd/'+device+'/Latitude', '');		
		this.mqttClient.publish('cmnd/'+device+'/Longitude', '');	
		this.mqttClient.publish('cmnd/'+device+'/PulseTime', '');	// get all pulse time
		this.mqttClient.publish('cmnd/'+device+'/LedPower', '');	// get power led state
		this.mqttClient.publish('cmnd/'+device+'/State', '');		// get power switches state, load average
		this.mqttClient.publish('cmnd/'+device+'/Module', '');		// get module type: Sonoff Bridge / Sonoff Basic / etc
		this.mqttClient.publish('cmnd/'+device+'/Modules', '');		// modules list
		this.mqttClient.publish('cmnd/'+device+'/SetOption13', '');	// button delay

		if (set_button_hold && devices[device]?.ModuleType !== BRIDGE_MODULE) 
			this.mqttClient.publish('cmnd/'+device+'/SetOption32', '');	// push button hold time
	}

	async restartDevice() {
		if (this.deviceOffline)
			return;
		if (!await showConfirm("Restart the device?"))
			return ;
		this.mqttClient.publish('cmnd/'+device+'/Restart', '1');
	}

	setupNavigation() {
		$('back-image')?.addEventListener("click", () => this.onButtonClose());
		$('apply_default')?.addEventListener("click", () => this.applyDefaultTimezone());
		$('save_button')?.addEventListener("click", () => this.saveDevice());
		$('close_button')?.addEventListener("click", () => this.onButtonClose());
		$('restart-image')?.addEventListener("click", () => this.restartDevice());
		$('advanced-image')?.addEventListener("click", () => this.advancedOptions());
		$('select-image')?.addEventListener("click", () => this.selectImage());
	}

	startMqttConnection() {	
    	this.mqttClient.mqttConnect();
	}

	startPage() {
		if (typeof config !== 'undefined')
			this.powerSwitches = config?.dHouse?.devices?.[device]?.PowerControls ?? 1;
  
		// build image list for selector
		this.modal = $("imageModal");
		this.selectedNameSpan = $("selected-name");
		if (typeof config !== 'undefined' && config.dHouse.devices)
			$("main_title").innerHTML = config.dHouse.devices[device]?.FriendlyName ?? device;
		this.selected = null;

		if (set_button_hold)
			this.buildButtonHold();

		this.buildImageSelector();
		this.fillDeviceIcon();
		this.fillPowerData();

		if (set_template)
			this.placeTemplateInput();

		this.startMqttConnection();
	}

}

// called from init_page after configuration is retrieved
function startPage() {
	configTasmota.startPage();
}

document.addEventListener("DOMContentLoaded", function() {
	configTasmota = new configTasmotaClass();
	configTasmota.setupNavigation();
	
	// flash icon whenclick over remove device
	const removeButton = $("remove-image");
	removeButton.addEventListener("click", () => {
		configTasmota.removeDevice();
	});
	const deviceInfoImg = $("device_info");
	deviceInfoImg.addEventListener("click", () => {
		configTasmota.devInfoMessage();
	});
});

// close modal image on outside user click
window.onclick = function(event) {
  	if (event.target.id == "imageModal")
       	configTasmota.modal.style.display = "none";
};
