// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

"use strict";

let controlDevice;

/*
 * timed_power_waiting_for will be active when timer is running
 * when timed_power_waiting_for[powerSwitch] = 1, we are waiting for power on
 * when timed_power_waiting_for[powerSwitch] = 0, we are waiting for power off
 */  
var timed_power_waiting_for = {};

class controlDeviceClass {

	multiPowerControlDisplayed = false;			// avoid placing multiple power controls more than once
	scheduleData = {};							// schedule data retrieved from tasmota device
	powerButtonState = [];						// power state for all device buttons
	deviceOnline = false;
	scheduleManager = null;						// everything related to schedule
	timerManager = null;						// everything related to user timer, will be created on start
	friendlyName = '';

	constructor () {
		this.mqttClient = new mqttTasmota();
		this.setMqttCallbacks();
		this.timerManager = new timerManagerClass(this, "timer-set", "timer-data");	
		this.scheduleManager = new scheduleManagerClass(this);
	}

	setMqttCallbacks() {
		const handlers = [
			[mqttTasmota.STAT_MESSAGE, this.mqttParseStatMessage],
  			[mqttTasmota.CONNECTION_SUCCESS, this.mqttConnectionSuccess],
			[mqttTasmota.CONNECTION_ERROR, this.mqttConnectionError],
			[mqttTasmota.POWER_CHANGE, this.mqttSinglePowerChange],
  			[mqttTasmota.DEVICE_OFFLINE, this.mqttDeviceOffline],
  			[mqttTasmota.DEVICE_ONLINE, this.mqttDeviceOnline],
  			[mqttTasmota.MULTI_POWER_SWITCHES, this.mqttMultiPowerSwitch],
  			[mqttTasmota.MULTI_POWER_CHANGE, this.mqttMultiPowerChange]
		];
		handlers.forEach(([topic, handler]) => {
  			this.mqttClient.callbackSubscribe(topic, handler.bind(this));
		});
	}

	// show all existing schedules
	// data comes from array: devices[device].Schedule [0...index]
	placeScheduleData() {
		if (Object.keys(this.scheduleData).length == 0)
			return;

		const scheduleDataTag = $("schedule-data");
		scheduleDataTag.innerHTML = "";
		for (let timerId in this.scheduleData) {
			if (timerId == "Timers")
				continue;
			this.showScheduleData(this.scheduleData[timerId],timerId.slice(5));
		}
	}

	scheduleEmpty(schedule) {
		// TODO: deep comparation must be used here
		const defaultSchedule = {
		  	Enable: 0, Mode: 0, Time: "00:00", Window: 0,
	  		Days: "0000000", Repeat: 0, Output: 1, Action: 0
		};
		return (JSON.stringify(schedule) === JSON.stringify(defaultSchedule));
	}

	// show schedule data row
	showScheduleData(schedule, index) {
		if (this.scheduleEmpty(schedule))
			return;

		let txt = "";
		let cell = "";

		const selectedDays = scheduleManagerClass.daysOfWeek.filter((_, index) => schedule.Days[index] === "1");
		const table = createElem("table");
		const row = createElem("tr");

		if (devices[device].PowerControls > 1) {
			// power switch name for multi power device
			const powerIndex = schedule.Output;
			const powerSwitchName = config.dHouse.devices[device]?.[`switch_${powerIndex}`] ?? `switch_${powerIndex}`;
			cell = row.insertCell();		
			txt = powerSwitchName;
			if (clientIsMobile()) {
				cell.width="80px";
				if (powerSwitchName.length > 9)
					txt = powerSwitchName.slice(0,9)+"..";
			}
			else {
				if (txt.length > 15)
					txt = txt.slice(0,15);
				cell.width="120px";
			}
	
			cell.style.cursor = "pointer";
			cell.addEventListener("click", () => {
				this.scheduleManager.openPopupSchedule(index,selectedDays,schedule);
			});
			cell.appendChild(document.createTextNode(txt));
		}

		cell = row.insertCell();
		cell.style.cursor = "pointer";
		cell.style.paddingTop = "4px";

		cell.addEventListener("click", () => {
			/** set index number for the selected schedule
		 	 ** scheduleManager will return this number in userSelectedScheduleDays callback
		 	 ** we need this index to store selected days in the corresponding schedule item
		 	 **/
			this.scheduleManager.openPopupSchedule(index,selectedDays,schedule);
		});

		// place all letter days inside a group
		let div = createElem("div", { id: `schedule_days_${index}`, style: { marginTop: "2px" }});
		cell.appendChild(div);
	
		// place each day with a blue dot over if the day it is selected
		scheduleManagerClass.daysOfWeek.forEach(function(day) {
			const span = createElem("span");
			span.setAttribute("data-id", day)
			span.classList.add(selectedDays.includes(day) ? "wordCalendar":"wordCalendarNoDot");
			// place only first letter of day name
			span.appendChild(document.createTextNode(day.slice(0,1)));
			div.appendChild(span);
		});

		// place selected days
		cell = this.insertCellWithPadding(row,4);
		cell.addEventListener("click", () => {
			this.scheduleManager.openPopupSchedule(index, selectedDays,schedule);
		});
		cell.style.cursor = "pointer";

		// time, sunrise or sunset
		if (schedule.Mode == 0) {
			// regular time timer
			cell.appendChild(document.createTextNode(schedule.Time));
		}
		else if (schedule.Mode == 1) {
				cell.appendChild(document.createTextNode("Sunrise"));
		 	}
		else if (schedule.Mode == 2) {
				cell.appendChild(document.createTextNode("Sunset"));
		 	}
		cell.width = "55px";
	
		cell = this.insertCellWithPadding(row,4,clientIsMobile() ? "35px":"80px");
		cell.addEventListener("click", () => {
			this.scheduleManager.openPopupSchedule(index, selectedDays,schedule);
		});
		cell.style.cursor = "pointer";

		if (schedule.Action != 2 && !clientIsMobile())
			cell.appendChild(document.createTextNode("Turn "));

		txt = schedule.Action == 0 ? "OFF":schedule.Action == 1 ? "ON":"TOGGLE";
		if (txt == 'TOGGLE' && clientIsMobile())
			txt = "TOG";
		const actionTxt = document.createTextNode(txt);
		const span = createElem("span", { style: { fontWeight: "bold" }});
		span.appendChild(actionTxt);
		cell.appendChild(span);

		cell = this.insertCellWithPadding(row,4);
		const slideCheckbox = this.createSlideCheckbox(`schedule_slide_${index}`,false,schedule.Enable == 1);
		cell.appendChild(slideCheckbox);
		table.appendChild(row);

		const scheduleDataTag = $("schedule-data");
		scheduleDataTag.appendChild(table);
	}

	insertCellWithPadding(row, padding, width) {
		let cell = row.insertCell();
		cell.style.padding =`${padding}px`;
		cell.width = width;
		return cell;
	}

	// user has changed on/off slide for a schedule timer
	scheduleSlideChanged(id) {
		const index = id.match(/\d+$/);
		const timerIndex = `Timer${index}`;
		const checkbox = $(id);

		this.scheduleData[timerIndex].Enable = checkbox.checked ? 1:0;
		const jsonData = JSON.stringify(this.scheduleData[timerIndex]);
		this.mqttClient.setScheduleTimer(device,index,jsonData) ;
	}

	// slide for turn on/off timer action
	// initially disabled until a value is selected in hour/min
	createSlideCheckbox(id, disable=false, checked=false) {
		let label = createElem("label", { classlist: "switch" });
		let input = createElem("input");
		if (disable) 
			input.disabled = true;

		input.id = id;
		input.type = "checkbox";
		input.checked = checked
	
		label.title = "Enable or Disable action";	
		label.appendChild(input);

		let span = createElem("span");
		span.setAttribute("class", "slider round");
		label.appendChild(span);
		return label;
	}

	// create img element
	createImage(imgSrc, imgOver, id, title, size, className="") {
		const img = createElem("img", { id: id, src: `img/${imgSrc}` });
		if (size)
			img.style.width = size;
		img.title = title;
		img.style.cursor = "pointer";

		if (imgOver !== "") {
			img.addEventListener("mouseover", function() {
				img.src = `img/${imgOver}`;
			});
			img.addEventListener("mouseout", function() {
				img.src = `img/${imgSrc}`;
			});
		}
		if (className!== "")
			img.classList.add(className);

		return img;
	}

	mqttDeviceOffline(dev) {
		if (dev != device)
			return;

	  	$('single-power-button').disabled = true;
		this.deviceOnline = false;
		this.timerManager.setDeviceOnline(false);
	
		let friendlyName = devices[dev]?.FriendlyName ?? dev;
		$('button_section').innerHTML = "<br>" + messageWithImage(`Device <b>${friendlyName}</b> is offline`, "img/refresh.png", "refresh_img", "Refresh") + "<br>";
		const refreshImg = $("refresh_img");
		refreshImg.onclick = function() {
			location.reload(true);
		}
		$("button_section").style.display = "block";
	}

	mqttDeviceOnline(dev) {
		if (dev != device)
			return;
	
		this.onDeviceOnline(true);
		$("button_section").style.display = "block";
	}

	// callback called from mqtt_tasmota 
	mqttConnectionError() {
		this.onDeviceOnline(false);
		setTimeout(this.startMqttConnection, 15000);
	}

	// mqtt_tasmota callback
	// TODO:
	//		place all in one single call to multiPowerChange
	//		single power receives true/false for powerState, multipower receives ON/OFF, use one criteria
	//		for single device power switch the status is on index 1, that's fine
	mqttSinglePowerChange(	dev, 
							powerState, 	// true/false
							powerSwitch		// 1 for single power switch device
	) {
		if (dev != device)
			return;

		this.powerButtonState[powerSwitch] = powerState;			// store power button state

		// show power button image
  		const powerControl = $('single-power-button');
		powerControl.src = powerState ? "img/switch-on.png":"img/switch.png";
		powerControl.style.display = "block";
		powerControl.removeAttribute("disabled");
	
		this.mqttClient.getTimedPower(dev);				// get timed power status to update timer image and status
		if (powerState) 
			this.mqttClient.getPulseTime(dev);			// get remaining time to set this device off
	}

	// callback from mqtt_tasmota for multiple control power change
	// this call could be sent for a real switch change or for status query
	mqttMultiPowerChange(dev, powerState, powerSwitch, sender) {
		if (dev != device)
			return;

		// store power button state
		const powerID = `MULTI_POWER${powerSwitch}`;
		this.powerButtonState[powerSwitch] = powerState;

		// show power button image
  		const powerControl = $(powerID);
		if (powerControl)
			powerControl.src = powerState=='ON' ? "img/switch-on.png":"img/switch.png";

		this.mqttClient.getTimedPower(dev);				// get timed power status to update timer image and status
		if (powerState == 'ON') 
			this.mqttClient.getPulseTime(dev);			// get remaining time to set this device off
	}

	// mqtt_tasmota callback
	// number of power switches for the device
	mqttMultiPowerSwitch(dev, powerSwitches) {
		if (dev != device)
			return;

		if (powerSwitches > 1) {
			// show icons for all-on and all-off
			$("all-on").style.display='block';
			$("all-off").style.display='block';
		}
		this.showPowerSwitches(dev, powerSwitches);
	}

	/** show switches for this device
  	* if this is the first time that "multi power state" is retrieved
  	* the number of power control buttons are going to be shown
  	* switch status will be updated in POWER_CHANGE
	**/
	showPowerSwitches(dev, powerSwitchCount) {
		if (!devices?.[dev])
			return;

		if (powerSwitchCount != devices[dev]?.PowerControls) {
			// store power control information for next usages
			// one value for each power control
			// for two switch will store "00", three switches "000", ...etc
			// a change in the powerSwitchCount could happens if device template has been changed and
			// new power switches has been detected
			if (powerSwitchCount == undefined)
				powerSwitchCount = 1;
			devices[dev].PowerControls = powerSwitchCount;
			storeConfigurationInServer();

			if (powerSwitchCount>1)
				$("single-power-button").style.display = "none";
		}
	
		devices[dev].PowerControls = powerSwitchCount;
		if (this.multiPowerControlDisplayed) 
			return;

		this.multiPowerControlDisplayed = true;
		this.timerManager.setPowerSwitches(powerSwitchCount);
	
		if (powerSwitchCount == 1) {
			// this is a one control button device
			// status will be handled by mqttSinglePowerChange
			// mqttSinglePowerChange(dev,false,0); <-- cannot call this one here, mqtt could not yet connected
			return;
		}

		// create required power switches for this device
		const multiPower = $("multi-power-button");
		for (let i=0; i<devices[dev].PowerControls; i++) {
			const div = createElem("div", { classlist: "power-item" });

			// timer remaing on top of switch button
			let span = createElem("span", { id: `remaining_timer_${i+1}` });
			span.style.visibility = 'hidden';
			span.style.fontSize = "12px";
	//		span.style.border = "1px solid #ccc"; 
	//		span.style.backgroundColor = "#f0f0f0";
			span.style.padding = "2px 4px"; 
	//		span.style.borderRadius = "4px";
			span.style.height='22px';
	//		span.style.width='105px';
			span.style.display = "inline-block";
			span.style.fontSize = "0.85rem";
			span.style.fontFamily = "sans-serif";
			span.title = "Timer";
			div.appendChild(span);

			// switch button
			const powerImg = createElem('img', { id: `MULTI_POWER${i+1}`, src: 'img/switch.png' });
			powerImg.style.width='55px';
			powerImg.style.cursor="pointer";
			powerImg.onclick = () => {
				this.userChangePowerButton(i+1);
			};
			div.appendChild(powerImg);

			// power switch name behind the switch image
			span = createElem("span");

			span.style.fontSize = "12px";
	//		span.style.border = "1px solid #ccc"; 
	//		span.style.backgroundColor = "#f0f0f0";
			span.style.padding = "5px 4px"; 
	//		span.style.borderRadius = "4px";

			span.textContent = config.dHouse.devices[device]?.[`switch_${i+1}`] ?? "unnamed";
			div.appendChild(span);
			multiPower.appendChild(div);
		}
	}

	// info returned by tasmota device after a schedule timer is updated
	updateScheduleTimerData(index, obj) {
		this.scheduleData[`Timer${index}`] = obj[`Timer${index}`];
		this.placeScheduleData();
	}

	// callback called from mqtt_tasmota 
	mqttParseStatMessage(topic, message, dev, statType) {
		if (dev !== device)
			return;

		let obj = "";
		try {
			obj = JSON.parse(message)
		} catch (e) {
			// console.log ("error: " + e);
			// console.log ("message: [" + message + "]");
			return ;
		};

		switch (statType)
		{	
			case 'STATUS2':
				// get firmware version
      			if (obj?.StatusFWR?.Version)
					this.onFirmwareVersion(obj["StatusFWR"]["Version"])
	 			break
			case 'RESULT':
				if (obj?.TimedPower) {
					this.timerManager.parseTimedPower(obj); // message);
					return;
				}
				if (obj?.Timers) {
					this.parseScheduleTimers(message);
					return;
				}
				/** posible answer for RESULT:
			  	* {"Timer1":{"Enable":0,"Mode":0,"Time":"09:40","Window":0,"Days":"1000010","Repeat":0,"Output":1,"Action":2}}
			  	*    ..
			  	* {"Timer16":{ ...}}
			  	* try to identify Timer1...Timer16 result
		    	**/
				for (const key of Object.keys(obj)) {
	  				const match = key.match(/^Timer(\d+)$/);
  					if (match) {
	    				const index = parseInt(match[1], 10); 
						this.updateScheduleTimerData (index, obj);
						return;
  					}
				}
      			break
			default:
				// console.log("unknown mqtt statType: "+statType)
	  	}
	}

	// get schedule timers, called from mqtt
	parseScheduleTimers(message) {
		try {
			this.scheduleData = JSON.parse(message);
		} catch (e) {
			console.log ("## error parsing scheduleData");
			return ;
		}
 		this.placeScheduleData();
	}

	// firmware version received
	onFirmwareVersion(device_version) {
	}

	// enable/disable controllers for this device
	onDeviceOnline(status) {	
		if (!this.deviceOnline)
			return;
		if (this.deviceOnline == status)
			return;

		const powerButton = $('single-power-button');
		powerButton.disabled = !status;
		this.deviceOnline = status;
		this.timerManager.setDeviceOnline(status);
		this.enableSlideTimer(status);
	}

	// enable/disable slide timer depending on power button 
	enableSlideTimer(status) {
	/*
		const slideTimer = $('slide-timer');
		if (running_timed_power) {
			slideTimer.disabled = false;
		}
		else {
			const disable = !status || timerManager.userTimerEmpty();
			slideTimer.disabled = disable;
		}
	*/
	}

	// click over power button  
	// change request is sent to the device
	// power button will be updated on device answer, image and status will not change here
	userChangePowerButton(powerSwitch) {	
		this.mqttClient.setPower(device,"toggle",powerSwitch); 
		this.mqttClient.resetTimedPower(device, powerSwitch);
	}

	// callback called from mqtt_tasmota 
	mqttConnectionSuccess() {
		// request list of devices status from dhouse proxy
		this.mqttClient.publish("cmd/dHouse/proxy","DevicesStatus");
		this.mqttClient.getState(device);
		this.mqttClient.getStatus(device, '0');
		this.mqttClient.getTimedPower(device);		// timers
		this.mqttClient.getTimers(device);			// schedule
	}

	startMqttConnection() {
		this.mqttClient.mqttConnect();
	}

	/** if we have information about the power controls for this device
  	  * then place the power controls now
  	  * if the information is not set, it will be shown when receiving mqtt information
  	  * and it will be saved to dhouse.config
	**/
	startPage() {
		if (devices?.[device]?.ModuleType === BRIDGE_MODULE) {
			go_url(`config_bridge.php?device=${device}`);
			return;
		}

		const friendlyName = config.dHouse.devices?.[device]?.["FriendlyName"] ?? '';
		if ($("main_title"))
			$("main_title").textContent = friendlyName;

		// show power buttons for this device
		// just to get a screen faster updated before connecting mqtt
		if (config?.dHouse?.devices?.[device]?.PowerControls) {
			const powerSwitches = config.dHouse.devices[device].PowerControls ?? 1;
			if (powerSwitches == 1)
				$("single-power-button").style.display = "block";
			else
				this.showPowerSwitches(device, powerSwitches);
		}

		if (def_hour!='' && def_min!='' && def_timer_action!='')
			this.timerManager.setDefaults(def_hour, def_min, def_timer_action);

		if (devices?.[device]?.PowerControls != undefined) 
			this.timerManager.setPowerSwitches(devices[device].PowerControls);

		this.timerManager.placeUserDefinedTimers();
		this.setMqttCallbacks();
		this.startMqttConnection();
	}
}


// called from init_page after configuration is retrieved
function startPage() {
	controlDevice.startPage();	
}

function setupNavigation() {
	$('settings-image')?.addEventListener("click", () => go_url(`config_tasmota.php?device=${device}`));
	$('log-image')?.addEventListener("click", () => go_url(`log_data.php?device=${device}`));
	$('notify-image')?.addEventListener("click", () => go_url(`edit_notify.php?device=${device}`));
}

document.addEventListener("DOMContentLoaded", function() {

	controlDevice = new controlDeviceClass();
	setupNavigation();
	setRolloverImage ("add_schedule_image", "img/add.png", "img/add-blue.png", "small-icon");
	setRolloverImage ("add_user_timer", "img/add.png", "img/add-blue.png", "small-icon");

	// show/close timer window
	const openTimer = $("open-timer-image");
	if (openTimer)
		openTimer.addEventListener("click", () => {
			const timerSection = $("timer-section");
			timerSection.style.display= timerSection.style.display == 'block' ? 'none':'block';
		});

	// show/close schedule window
	const openSchedule = $("open-schedule-image");
	if (openSchedule)
		openSchedule.addEventListener("click", () => {
			const scheduleSection = $("schedule-section");		
			scheduleSection.style.display = scheduleSection.style.display == 'block' ? 'none':'block';
			// if it is diplayed scroll to this id
			// useful when using a cell phone
			document.querySelector("#open-schedule-image").scrollIntoView({ behavior: "smooth" });
		});

	const addSchedule = $("add_schedule_image");
	addSchedule.addEventListener("click", () => {
		controlDevice.scheduleManager.addSchedule();
	});

	// save schedule rollover
	// setRolloverImage ("save_schedule_image", "img/save.png", "img/save-blue.png", "small-icon");

	// main button for device power
	const powerButton = $("single-power-button");
	powerButton.addEventListener("click", function (event) {
		controlDevice.userChangePowerButton(0);
	});

	// click over 'all switches on' 
	const allOnButton = $("all-on");
	allOnButton.onclick = function() {
		if (devices[device].PowerControls > 1) 
			controlDevice.mqttClient.setPower(device,'1','0');	// power0 = all devices
	};

	const allOffButton = $("all-off");
	allOffButton.onclick = function() {
		if (devices[device].PowerControls > 1)
			controlDevice.mqttClient.setPower(device,'0','0');	// power0 = all devices
	};

	// click catch up for schedule selects (hour, min, action)
	document.addEventListener("change", (event) => {
		const id = event.target.id;
  		if (!id) 
			return; 

		const actions = {
			"schedule_slide_": controlDevice.scheduleSlideChanged.bind(controlDevice)
		};
    	const key = Object.keys(actions).find(prefix => id.startsWith(prefix));
    	if (key)
			actions[key](id);
	});
});

