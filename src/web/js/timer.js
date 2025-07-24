// dHouse
// Tasmota devices manager
// timer functions for control_device.php
//
// Jorge Elissalde 2025


// TODO: replace timer 'type' var for 'action'

class timerManagerClass {

	// TODO: move to constructor
	static MAX_TIMERS = 5;

    parent = null;
	timerSet = null;	// div tag for show timer set elements
	timerData = null;	// div tag for show existing timers
	defaultValues = {};
	powerSwitches = 1;
	deviceOnline = false;

	constructor (p_parent, timerSet, timerData) {
 		if (p_parent === undefined || timerSet === undefined || timerData === undefined) {
            throw new Error("userTimer: timerSet and timerData must be defined");
        }
		this.parent = p_parent;
		this.timerSet = timerSet;
		this.timerData = timerData;
	}

	setDefaults(hour, min, action) {
		this.defaultValues["hour"] = hour;
		this.defaultValues["min"] = min;
		this.defaultValues["action"] = action;
	}

	setPowerSwitches(powerSwitches) {
		timerManagerClass.powerSwitches = powerSwitches;
	}

	setDeviceOnline(online) {
		timerManagerClass.deviceOnline = online;
	}

	// place already defined user timers
	placeUserDefinedTimers() {

		const timers = devices?.[device]?.Timer;
		if (!timers || timers.length == 0)
			return;

		const timerData = $(this.timerData);
		timerData.innerHTML = "";

		const table = createElem("table");
		const titleRow = createElem("tr");

		// timer = hour, min, type
		// show existing timers

		Object.values(timers).forEach((userData, index) => {
			// place each timer data
			const row = createElem("tr");
			let cell = "";

			cell = row.insertCell();
			const deleteImg = createElem("img", { src: "img/cross.png", style: { cursor: "pointer",
																				 opacity: "0.5",
																				 width: "12px"
																				}});
			deleteImg.title = "Delete Timer";
			deleteImg.onclick = () => {
				this.deleteUserTimer(index);
			};
			cell.style.padding = "2px";
			cell.appendChild(deleteImg);

			if (timerManagerClass.powerSwitches>1) {
				// this device has more than 1 power switch
				// display select with switch name
				cell = row.insertCell();
				let width = clientIsMobile() ? 80:130;

				const selectSwitch = createSelectPowerSwitch(`timer_power_switch_${index}`,width, devices[device].Timer[index].switch);
				selectSwitch.onchange = function() {
					$("save-timers-data").style.display = "inline-block";
					const powerSwitchIndex = selectSwitch.value.split("_")[1];
					devices[device].Timer[index].switch = powerSwitchIndex;
				}
				cell.appendChild(selectSwitch);
				cell.style.padding = "2px";
			}

			// hour select 
			cell = row.insertCell();
			const selectHour = createSelect(`timer_hour_${index}`, 50, 0, 23, "h", userData.hour); // this.defaultValues["hour"]));
			selectHour.onchange = function() {
				$("save-timers-data").style.display = "inline-block";
				devices[device].Timer[index].hour = selectHour.value;
			}
			cell.appendChild(selectHour);
			cell.style.padding = "2px";

			// minute select
			cell = row.insertCell();
			const selectMinute = createSelect(`timer_minute_${index}`, 60, 0, 59, "min", userData.min); // this.defaultValues["min"]));
			selectMinute.onchange = function() {
				$("save-timers-data").style.display = "inline-block";
				devices[device].Timer[index].min = selectMinute.value;
			}
			cell.appendChild(selectMinute);
			cell.style.padding = "2px";

			// turn on/off select
			cell = row.insertCell();
			const selectAction = createOnOffSelect(`timer_action_${index}`,
													userData.type,
													clientIsMobile()		// short message
			);

			selectAction.onchange = function() {
				$("save-timers-data").style.display = "inline-block";
				devices[device].Timer[index].type = selectAction.value;
			}
			cell.appendChild(selectAction);
			cell.style.padding = "2px";
			cell = row.insertCell();
			const slideCheckbox = this.parent.createSlideCheckbox(`slide-timer_${index}`);
			cell.appendChild(slideCheckbox);
			table.appendChild(row);

		});
		timerData.appendChild(table);
	}

	// user has click over delete user defined timer
	async deleteUserTimer(index) {
		if (!await showConfirm("Delete timer?"))
			return ;

		devices[device].Timer.splice(index, 1);

		const timerData = $(this.timerData);
		timerData.innerHTML = "";
		this.placeUserDefinedTimers();
		// store configuration in server dhouse.config file
		storeConfigurationInServer();
	}

	// add user defined timer, called after the user started a timer
	addUserTimer(hour, min, type) {
    	// return if this timer it is already defined

		if (devices[device].Timer == null)
			devices[device].Timer = [];

		const timers = devices[device].Timer;

		// add timer and show all 
		if (devices[device].Timer.length >= timerManagerClass.MAX_TIMERS) {
			const msg = "Could not add a new timer.<br>Max allowed: " + timerManagerClass.MAX_TIMERS;
			showMessage(msg, "Timers");
			return ;
		}

		devices[device].Timer.push( { "hour":hour, "min":min, "type":type });
		this.placeUserDefinedTimers();
		$("save-timers-data").style.display = "inline-block";	// show 'save' button
	}

	// user has click over slide timer button
	userTimerClick(index) {
		// get 'index' timer values
		const timers = devices[device]?.Timer;
		if (!timers)
			return;	// should not happen

		// move that value to current timer
		const selectHour = $("timer_hour");
		const selectMin = $("timer_minute");
		const selectAction = $("timer_action");

		selectHour.value = timers[index].hour;	
		selectMin.value = timers[index].min;
		selectAction.value = timers[index].type;

		controlDevice.mqttClient.resetTimedPower(device);				// stop current timed power
		this.userChangeSlideTimer(true);				// start this timer
	}

	// show remaining time to activate timer
	// remaining = ms
	displayTimerTimeToGo(remaining, timerID = 'timer_msg', powerSwitch = 1) {

		for (const [powerSwitch, timerData] of Object.entries(timed_power_waiting_for)) {
			const waitingFor = timerData['waitingFor'];
			const remaining = timerData['remaining'];
			const finish_time = Date.now() + remaining;
			const date = new Date(finish_time);  
			const time = date.toTimeString().split(' ');

			let timerObj = "";
			if (timerManagerClass.powerSwitches>1) 
				timerObj = $(`remaining_timer_${powerSwitch}`);
			else
				timerObj = $("timer_msg");
			if (remaining == 0) {
				// nothing to show, timer has finished
				if (timerManagerClass.powerSwitches>1) 
					timerObj.style.visibility = 'hidden';
				else
					timerObj.innerHTML = "";
				continue;
			}

			if (timerManagerClass.powerSwitches>1) {
				timerObj = $(`remaining_timer_${powerSwitch}`);
				timerObj.innerHTML = time[0] + "&nbsp;";
				timerObj.style.visibility = 'visible';
			}
			else {
				timerObj = $("timer_msg");
				timerObj.innerHTML = time[0] + "&nbsp;";
				timerObj.style.display = 'flex';
			}
			if (waitingFor == 1) 
			 	timerObj.innerHTML += "<span class='status-circle on'></span>";
			else
				timerObj.innerHTML += "<span class='status-circle off'></span>";
		}
	}

	// uncheck slides with remaining time = 0
	// TODO: merge with updateTimerIcon

	resetSlideSwitches() {
		// search all timer data stored in 'timed_power_waiting_for'
		// unckeched required start checkbox timer having remaining = 0
	
		for (const [powerSwitch, timerData] of Object.entries(timed_power_waiting_for)) {
			const userTimerIndex = timerData['userTimerIndex'];
			if (userTimerIndex == undefined)
				continue;
			if (timerData['remaining'] == 0)
				$(`slide-timer_${userTimerIndex}`).checked = false;
		}
	}

	/** get every value for timed power for single power device
	 ** received when a timed power is started and on connection start to detect already running timed power
	 ** Object { TimedPower: (1) […] }
	 **		TimedPower: Array [ {…} ]
	 **			0: Object { Remaining: 2613, Command: "Power1 1" }
	 **			1: Object { Remaining: 3380, Command: "Power2 0" }
	 **
	 ** return value could also be "empty" or "done"
	 **/
	parseTimedPower(timedPower) {

		this.updateTimerIcon(timedPower);	// update "open timer" icon to view normal or blue icon

		// reset all remaining values to allow them to be removed from the button
		// values not received from mqtt means they are finished
		for (const [powerSwitch, timerData] of Object.entries(timed_power_waiting_for))
			timed_power_waiting_for[powerSwitch]['remaining'] = 0;

		if (Array.isArray(timedPower?.TimedPower)) {
	   	   /*
		  	* result of timers for this device:
	  		* TimedPower: Array [ {…}, {…} ]
			*		0: Object { Remaining: 2613, Command: "Power1 1" }
			*		1: Object { Remaining: 3380, Command: "Power2 0" }
	  		* just a single element will be shown if this is a single power device
			*
			* powerSwitch for a single power device will be = 1
	 		*/
			// set remaining values and waitingFor for every power switch
			for (let i=0; i<=timedPower.TimedPower.length; i++) 
				if (timedPower?.TimedPower[i]?.Command) {
					// set what the power change should be waiting for a timer end
					const cmd = timedPower.TimedPower[i].Command.split(" ");
					const waitingFor = cmd[1];
					const powerSwitch = cmd[0].slice(5);
					const remaining = timedPower.TimedPower[i].Remaining;

					if (timed_power_waiting_for[powerSwitch] == undefined)
						timed_power_waiting_for[powerSwitch] = {};
					timed_power_waiting_for[powerSwitch]['waitingFor'] = waitingFor;
					timed_power_waiting_for[powerSwitch]['remaining'] = remaining;
				}
		}
		this.displayTimerTimeToGo();	// show remaining time to activate timer or cleanup data
		this.resetSlideSwitches();		// uncheck slides with remaining time = 0
	}

	/** set on/off "open timer" icon
	  * message is received from updateTimedPower after receiving timedPower data from mqtt
	  *
	  * TimedPower: Array [ {…}, {…} ]
	  *		0: Object { Remaining: 2613, Command: "Power1 1" }
	  *	 	1: Object { Remaining: 3380, Command: "Power2 0" }
	  * just a single element will be shown if this is a single power device
	 **/
	updateTimerIcon(timedPower) {
		if (timedPower?.TimedPower && timedPower.TimedPower == "Empty") {
			// no timers running set default image for "open timer" image
			$('open-timer-image').src = "img/timer.png";
			return;
		}

		if (timedPower?.TimedPower && timedPower.TimedPower == "Done")
			return;	// nothing to do

		if (!Array.isArray(timedPower?.TimedPower)) 
			return;

		let remaining = 0;
		for (let i=0; i<=timedPower.TimedPower.length && remaining==0; i++) 
			if (timedPower?.TimedPower[i]?.Command) 
				remaining = timedPower.TimedPower[i].Remaining;

		if (remaining) 
			$('open-timer-image').src = "img/timer-blue.png";
	}
	

	// press over timer slide
	userChangeSlideTimer(force = false, userTimerIndex = -1) {

		if (userTimerIndex == -1) 
			return;

		const slideTimer = $(`slide-timer_${userTimerIndex}`);

		if (slideTimer.checked || force) {	
			if (this.userTimerEmpty(userTimerIndex)) {
				slideTimer.checked = false;
				return ;
			}

			// start the requested timer for the action
			const hour = $(`timer_hour_${userTimerIndex}`).value;
			const min = $(`timer_minute_${userTimerIndex}`).value
			const action = $(`timer_action_${userTimerIndex}`).value

			// calculate milliseconds
			var ms = min * 60000;
			ms += hour * 3600000;
			if (ms == 0) {
				slideTimer.checked = false;
				return;
			}

			// value for timedPower
			// invert command
			// ON for dHouse = Turn ON After xx time 
			// ON for Tasmota = Turn ON and after xx time turn OFF

			let actionToTake = action;
			let powerSwitch = 1;

			if (actionToTake !== 'TOGGLE')
				actionToTake = actionToTake == "ON" ? "OFF":"ON";

			if (timerManagerClass.powerSwitches>1) {
				// multi power switches device
				const switchName = $(`timer_power_switch_${userTimerIndex}`).value;
				powerSwitch = Number(switchName.split("_")[1]);
				controlDevice.mqttClient.setTimedPower(device, ms.toString(), actionToTake, powerSwitch);
			}
			else {
				// single power switch device
				controlDevice.mqttClient.setTimedPower(device, ms.toString(), actionToTake);
			}

			// other existing timers that could be enabled must be set to off
			if (timerManagerClass.powerSwitches == 1)
				this.setOffOtherTimers(userTimerIndex);
		
			timed_power_waiting_for[powerSwitch] = {};
			timed_power_waiting_for[powerSwitch]['waitingFor'] = action == 'ON' ? 1:0;
			timed_power_waiting_for[powerSwitch]['userTimerIndex'] = userTimerIndex;

			controlDevice.mqttClient.getTimedPower(device);					// request value from device to correcly set Timer actual settings
		}
		else {

			// get power switch index
			let powerSwitch = 0;
			if (timerManagerClass.powerSwitches > 1) {
				const switchName = $(`timer_power_switch_${userTimerIndex}`).value;
				powerSwitch = Number(switchName.split("_")[1]);
			}
			this.stopTimedPower(powerSwitch);
		}
	}

	// turn off other timers that could be active
	// skipTimer is the active timer
	setOffOtherTimers(skipTimer) {
		const skipName = `slide-timer_${skipTimer}`;
		const allTimers = document.querySelectorAll('[id^="slide-timer_"]');
		const timerIds = Array.from(allTimers)
  			.map(el => el.id)
  			.filter(id => /^slide-timer_\d+$/.test(id));
		
		timerIds.forEach ((name) => {
			if (name !== skipName)
				$(name).checked = false;
		});
	}

	userTimerEmpty(timerIndex) {
		const hour = Number($(`timer_hour_${timerIndex}`)?.value) || 0;
		const min = Number($(`timer_minute_${timerIndex}`)?.value) || 0;
		return hour == 0 && min == 0;
	}

	// store in PHP session current values for timer (h,m,action)
	storeTimerValuesInPhpSession() {
		const hour = $('timer_hour').value;
		const min = $('timer_minute').value;
		const action = $('timer_action').value;
		set_php_session(`hour=${hour}&min=${min}&timer_action=${action}`);
	}

	// manually stop any running timed power
	stopTimedPower(powerSwitch=0) {
		controlDevice.mqttClient.setPower(device,'off',powerSwitch);
		controlDevice.mqttClient.resetTimedPower(device,powerSwitch);
		controlDevice.mqttClient.getTimedPower(device);
	}

	// user click over "save" button for timers
	saveTimersData() {
		storeConfigurationInServer();
		$('save-timers-data').style.display='none';
	}

};

document.addEventListener("DOMContentLoaded", function() {

	// "click" listener
	// check timer buttons "(>)" to trigger a user pre defined timer
    document.addEventListener("click", function (event) {

		const { id } = event.target;
  		if (!id)
			return; 

		if (id == 'save-timers-data') {
			controlDevice.timerManager.saveTimersData();
			return;
		}

		if (id == 'add_user_timer') {
			controlDevice.timerManager.addUserTimer(0,0,1);
			return;
		}

		// user click over start/stop timer
		// name = slide-timer_n
		const match = id.match(/^slide-timer_(\d+)$/);
		if (match) {
   			const slideIndex = parseInt(match[1], 10);
			controlDevice.timerManager.userChangeSlideTimer(false, slideIndex);
		}

		// if power button is disabled the device is not connected		
		const powerButton = $("single-power-button");
		if (powerButton && powerButton.hasAttribute("disabled"))
			return;

 		if (id.startsWith("timer_go_")) {
		    controlDevice.timerManager.userTimerClick(id.slice(9));
    	} 
		else 
			if (id.startsWith("timer_trash_")) {
        		controlDevice.timerManager.deleteUserTimer(id.slice(12));
		   	}

	});
});
