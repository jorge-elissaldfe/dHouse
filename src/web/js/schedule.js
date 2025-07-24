/* dHouse
 * Tasmota devices manager
 * Schedule functions for control_device.php
 * Jorge Elissalde 2025
 * 
 * timers are store and retrieved to/from device
 * there is no configuration file for this data
 */
class scheduleManagerClass {

	parent = null;
    popup = $("popup");		// defined in schedule_popup.html
    overlay = $("overlay");	//		""
	days = [];

	static MODE_CLOCK = 0;
	static MODE_SUNRISE = 1;
	static MODE_SUNSET = 2;

	mode = scheduleManagerClass.MODE_CLOCK;
	hour = 0;
	min = 0;
	sign = '+';
	action = "OFF";
    
	powerSwitch = "";

	static daysOfWeek = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]; 

    constructor(p_parent) {
		this.parent = p_parent;
    	this.overlay.addEventListener("click", () => {
			// click out of popup, cancel everything
			this.popup.style.display = "none";
			this.overlay.style.display = "none";
        });

		const buttonAccept = $("button-accept");
		buttonAccept.addEventListener("click", () => {
			// turn off popup
			this.popup.style.display = "none";
			this.overlay.style.display = "none";
			this.getSelectedData();
		});

		const buttonDelete = $("button-delete");
		buttonDelete.addEventListener("click", () => {
			// set Timer to default values and send them to the device

			const defaultSchedule = {
	  			Enable: 0, Mode: 0, Time: "00:00", Window: 0,
	  			Days: "0000000", Repeat: 0, Output: 1, Action: 0
			};

			const jsonData = JSON.stringify(defaultSchedule);
			this.parent.mqttClient.setScheduleTimer(device,this.index,jsonData);
			// turn off popup
			this.popup.style.display = "none";
			this.overlay.style.display = "none";
		});
	}

	setScheduleTimer (hour, min, action, mode, sign) {
		this.hour = hour;
		this.min = min;
		this.action = action;
		this.mode = mode;
		this.sign = sign;
	}

	// number of schedule, this index will be returned in the callback
	setIndex(index) {
		this.index = index;
	}

	/* user has clicked over Accept
	 * get all selected checkbox for days
	 * get data for hour, minute, action, mode, power switch
     */
	getSelectedData() {

		// get selected days
		const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
		const selectedValues = [];
		checkboxes.forEach(function(checkbox) {
			if (checkbox.name == "cal_word") 
				selectedValues.push(checkbox.id.slice(-2));	// last 2 characters from 'schedule_day_MO' ... etc
		});

		const hour = $("schedule_hour").value; 
		const min = $("schedule_minute").value;
		const mode = $("select_mode").value;
		let   time = hour.padStart(2,'0') + ":" + min.padStart(2,'0');
		const sign = $("select_sign").value;

		if (mode != scheduleManagerClass.MODE_CLOCK) {
			// add sign for sunset / sunrise
			time = sign + time;
		}

		// get power switch index
		let powerIndex = 1;
		if ($("schedule_power_switch"))
			powerIndex = parseInt($("schedule_power_switch").value.slice(7), 10);

		// build a timerdata set with selected data
		const timerData = {  time: time,
							 action:$("schedule_action").value,
							 mode: mode,
							 powerSwitch:powerIndex };

		this.userSelectedScheduleData(selectedValues, timerData);
	};

	setSelectedScheduleDays(selectedValues) {
		this.days = selectedValues;
	}

	setSelectedPowerSwitch(powerSwitch) {
		this.powerSwitch = powerSwitch;
	}

	openPopup() {
		this.setScheduleSelects();

		// set selected days taken from array days
		document.querySelectorAll("[id^='schedule_day_']").forEach((el) => {
    		const dayName = el.id.replace("schedule_day_", "").trim(); 
    		el.checked = this.days.includes(dayName); 
		});

        this.popup.style.display = "block";
        this.overlay.style.display = "block";

		const rect = this.popup.getBoundingClientRect();
		const popupWidth = rect.width;
		const popupHeight = rect.height;
		const x = event.clientX - popupWidth / 2;
		const y = event.clientY - popupHeight / 2;

		this.popup.style.left = `${x}px`;
		this.popup.style.top = `${y}px`;
    };


	openPopupSchedule(index, selectedDays, schedule) {
		let hour = schedule.Time.substr(0,2);
		let min = schedule.Time.substr(3,2);
		let sign = '+';

		// time could be defined for sunrise/sunset, which starts with '-' and optional '+'
		// +00:12 / -01:20

		if (schedule.Time.substr(0,1) == '-' || schedule.Time.substr(0,1) == '+') {
			sign = schedule.Time.substr(0,1);
			hour = schedule.Time.substr(1,2);
			min = schedule.Time.substr(4,2);
		}

		this.setIndex(index);
		this.setSelectedPowerSwitch(schedule.Output);
		this.setSelectedScheduleDays(selectedDays);
		this.setScheduleTimer (hour,min,schedule.Action == 1 ? "ON":schedule.Action == 0 ? "OFF":"TOGGLE", schedule.Mode, sign);
		this.openPopup();
	}

	// build schedule popup 
	setScheduleSelects() {
		const selScheduleData = $("schedule-data-popup");
		const table = createElem("table");
		let row = "";
		let cell = "";

		if (devices[device].PowerControls > 1) {
			row = createElem("tr");
			cell = row.insertCell();
			cell.appendChild(document.createTextNode("Switch:"));
			cell = row.insertCell();
			const selectSwitch = createSelectPowerSwitch(`schedule_power_switch`, 140, this.powerSwitch);
			cell.appendChild(selectSwitch);
			cell.colSpan=3;
			table.appendChild(row);
		}

		// timer mode: clock time, sunset, sunrise
		row = createElem("tr");
		cell = row.insertCell();
		cell.appendChild(document.createTextNode("Mode: "));

		cell = row.insertCell();
		cell.colSpan = 2;
		const selectMode = createElem("select", { id: "select_mode" });

		selectMode.addEventListener("change", () => {
			// remap select for time/offset
			// remap hour
			if (selectMode.value == scheduleManagerClass.MODE_CLOCK) {
				$("time_title").innerHTML = "Time:";
				this.remapSelectTime('schedule_hour', 0, 23, 'h', this.hour);	// set as timer clock
				$('select_sign').style.visibility = "hidden";
			}
			else {
				$("time_title").innerHTML = "Offset:";
				if (this.hour > 11)
					this.hour = 0;
				this.remapSelectTime('schedule_hour', 0, 11, 'h', this.hour);	// set as offset from sunrise/sunset
				$('select_sign').style.visibility = "visible";
			}
		});

		let option = createElem("option", { text: "Clock time" });
		option.value = scheduleManagerClass.MODE_CLOCK;
		option.selected = (this.mode == option.value);
		selectMode.appendChild(option);

		option = createElem("option", { text: "Sunrise" });
		option.value = scheduleManagerClass.MODE_SUNRISE;
		option.selected = (this.mode == option.value);
		selectMode.appendChild(option);

		option = createElem("option", { text: "Sunset" });
		option.value = scheduleManagerClass.MODE_SUNSET;
		option.selected = (this.mode == option.value);
		selectMode.appendChild(option);
		cell.appendChild(selectMode);
		table.appendChild(row);

		// action: on, off, toggle
		row = createElem("tr");
		cell = row.insertCell();
		cell.appendChild(document.createTextNode("Action: "));
		cell = row.insertCell();
		cell.colSpan=2;
		cell.appendChild(createOnOffSelect("schedule_action", 
											this.action, 		// id
											false, 				// short message
											true				// show toggle option
		));
		table.appendChild(row);

		// clock time / offset
		row = createElem("tr");
		// title
		cell = row.insertCell();
		cell.id = 'time_title';
		if (this.mode == scheduleManagerClass.MODE_CLOCK)
			cell.appendChild(document.createTextNode("Time: "));
		else
			cell.appendChild(document.createTextNode("Offset: "));


		cell = row.insertCell();
		if (this.mode == scheduleManagerClass.MODE_CLOCK)
			cell.appendChild(createSelect("schedule_hour", 40, 0, 23, "h", this.hour));
		else
			cell.appendChild(createSelect("schedule_hour", 40, 0, 11, "h", this.hour));
		cell.appendChild(document.createTextNode(":"));
		cell.appendChild(createSelect("schedule_minute", 60, 0, 59, "min", this.min));

		const selectOffsetSign = createElem("select", { id: "select_sign", style: { width: "22px" } });
		if (this.mode == scheduleManagerClass.MODE_CLOCK)
			selectOffsetSign.style.visibility = "hidden";

		option = createElem("option", { value: "-", text: "-" });
		if (this.hour < 0)
			option.selected = true;
		option.selected = this.sign == '-';
		selectOffsetSign.appendChild(option);

		option = createElem("option", { value: "+", text: "+"});
		if (this.hour >= 0)
			option.selected = true;
		option.selected = this.sign == '+';
		selectOffsetSign.appendChild(option);

		cell.appendChild(document.createTextNode(" "));
		cell.appendChild(selectOffsetSign);
		table.appendChild(row);

		row = createElem("tr", { style: { height: "16px" }});
		table.appendChild(row);
		selScheduleData.innerHTML = "";
		selScheduleData.appendChild(table);
	}

	// change options for select, timer clock, sunset/sunrise
	// timer clock 0 - 23, sunset/sunrise offset 0 -  11
	remapSelectTime(selectID, min, max, unit, defaultValue, negativeValues) { // 'schedule_hour', 0, 23, 'h') {
 		const fragment = document.createDocumentFragment();
		if (negativeValues) {
			for (let i = -max; i <= -min; i++) {
		       	const option = createElem("option");
       			option.value = i;
				option.selected =  (i == defaultValue);
       			option.textContent = `${i} ${unit}`;
       			fragment.appendChild(option);
			}
			++min;	// avoid 0 value twice
		}
    	for (let i = min; i <= max; i++) {
	       	const option = createElem("option");
       		option.value = i;
			option.selected =  (i == defaultValue);
       		option.textContent = `${i} ${unit}`;
       		fragment.appendChild(option);
   		}
		$(selectID).innerHTML = "";
   		$(selectID).appendChild(fragment);
	}

	/* user has finished schedule data input
	 * selectedDays = ['SU','WE','SA']
	 * set this new set to device
     */
	userSelectedScheduleData(selectedDays, timerData) {
		const binarySchedule = scheduleManagerClass.daysOfWeek
  			.map(day => selectedDays.includes(day) ? "1" : "0")
  			.join("");
	
		const timerID = `Timer${this.index}`;
		this.parent.scheduleData[timerID].Days = binarySchedule; 
		this.parent.scheduleData[timerID].Time = timerData.time;
		this.parent.scheduleData[timerID].Action = timerData.action == 'ON' ? 1:timerData.action == 'OFF' ?0:2;
		this.parent.scheduleData[timerID].Output = timerData.powerSwitch;
		this.parent.scheduleData[timerID].Mode   = timerData.mode;

		// build JSON timer
		this.parent.scheduleData[timerID].Repeat = 1;
		const jsonData = JSON.stringify(this.parent.scheduleData[timerID]);
		this.parent.mqttClient.setScheduleTimer(device,this.index,jsonData) ;
	};

	// user click on add schedule image
	addSchedule() {
		// check for an available free place in the device
		// schedule limit is 16 places in tasmota device
		let freeIndex = 1;
		for (; freeIndex<16; freeIndex++) {
			const timerId = `Timer${freeIndex}`;
			const sch = this.parent.scheduleData[timerId];
			if (sch.Action == 0 && sch.Days == "0000000" && sch.Enable == 0 && sch.Mode == 0 &&
			    sch.Output == 1 && sch.Repeat == 0 && sch.Time == "00:00" && sch.Window == 0)
				break;
		}

		if (freeIndex == 16) {
			showMessage("Could not add more schedules, max reached.")
			return;
		}

		const timerIndex = `Timer${freeIndex}`;
		const defaultSchedule = {
		  	Enable: 0, Mode: 0, Time: "00:00", Window: 0,
	  		Days: "0000000", Repeat: 0, Output: 1, Action: 0
		};

		this.parent.scheduleData[timerIndex] = defaultSchedule;
		// add a change to avoid remove because default detection
		// store it in the device
		this.parent.scheduleData[timerIndex].Repeat = 1;
		const jsonDataOut = JSON.stringify(this.parent.scheduleData[timerIndex]);
		this.parent.mqttClient.setScheduleTimer(device,freeIndex,jsonDataOut);

		// enable all timers
		this.parent.mqttClient.setTimersOnOff(device, true);
	}
}
