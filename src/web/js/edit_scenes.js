// dHouse
// Tasmota devices manager
// jorge elissalde 2025

"use strict";

let editScenes;

class editScenesClass {

	waitingRemoteButton = false;
	waitingRemoteButtonImageIndex = 0;
	firstReceivedRemoteButtonID = null;
	triggerNumber = 0;
	actionNumber = 0;
	dataArray = {};		// current editig scene
	scenesArray = {};	// all existing scenes
	mqttClient = null;

	constructor () {
		this.mqttClient = new mqttTasmota();
	}

	// build a generic select for time 
	buildSelectTime(min, max, unit, defaultValue=-1) {
 		let fragment = document.createDocumentFragment();
    	for (let i = min; i <= max; i++) {
	       	const option = createElem("option", { value: i, text: `${i} ${unit}` });
			if (defaultValue == i)
				option.selected = true;
       		fragment.appendChild(option);
   		}
		return fragment;
	}

	addTrigger() {
		const triggerID = ++this.triggerNumber;
		if (!this.dataArray.triggers)
			this.dataArray.triggers = [];

		// init the trigger for this triggerID
		// device init will be done in createDeviceSelect
		this.dataArray.triggers[triggerID-1] =  { action : "button", device : "", deviceState : "", button: "", time: "" } ;
		this.appendTriggerOnScreen(triggerID-1);
	}

	/*
 	 * append a trigger in the visual "Trigger" box
 	 * all options are added here: Button, Device, Timer of day
 	 * option shown depends on option selected on selectTrigger
 	 * only selected option is shown, the others are hidden
 	 */
	appendTriggerOnScreen(triggerID, setVisible = true) {
		// condition select ( Button, Device, Timeofday)
		const condition = createElem("tr", { id: `condition_${triggerID}` });
		const triggerSelID = `not_used_trigger_id${triggerID}`;
		let select;
		let tdLabel = this.createTDLabel("Trigger", triggerSelID)

		tdLabel.style.setProperty("width", "24%", "important");	
		condition.appendChild(tdLabel);

		// add conditions select (button, device, time)
		const tdSelect = createElem("td");
		tdSelect.style.setProperty("width", "60%", "important");
		let selectTrigger = createElem("select", { id: triggerSelID });

		selectTrigger.onchange = (event) => {
			$(`condition_button_${triggerID}`).style.display = "none";
			$(`condition_device_${triggerID}`).style.display = "none";
			$(`condition_time_${triggerID}`).style.display = "none";

			switch (event.target.value) {
				case 'button':
					$(`condition_button_${triggerID}`).style.display = "table-row";
					this.dataArray.triggers[triggerID].action = 'button';
					break;
				case 'device':
					$(`condition_device_${triggerID}`).style.display = "table-row";
					this.dataArray.triggers[triggerID].action = 'device';
					break;
				case 'time':
					$(`condition_time_${triggerID}`).style.display = "table-row";
					this.dataArray.triggers[triggerID].action = 'time';
					break;
			}
		};

		// select options
		const options = [
			{ value: "button", text: "Button" },
			{ value: "device", text: "Device" },
			{ value: "time", text: "Time of day" }
		];

		// add options to the select
		options.forEach(opt => {
			const option = createElem("option", { value: opt.value, text: opt.text });
			option.selected = (this.dataArray.triggers[triggerID].action == opt.value) ? true:false;
			selectTrigger.appendChild(option);
		});

		tdSelect.appendChild(selectTrigger);
		condition.appendChild(tdSelect);
		// add options for button
		// show button only if currently selected in dataArray.triggers[ID][0].action
		const conditionButton = createElem("tr", { id: `condition_button_${triggerID}` });
		if (this.dataArray.triggers[triggerID].action !== 'button')
			conditionButton.style.display = 'none';
		conditionButton.appendChild(this.createTDLabel("Button", `not_used_${triggerID}`));

		/** select for RF buttons
	  	 *	createButtonsSelect will initialize dataArray.triggers for button selected
	  	 * 'onchange' function will also update those values
 	  	*/	
		select = this.createButtonsSelect(this.dataArray.triggers[triggerID]);
		select.id = `not_used_${triggerID}`;
		tdLabel = createElem("td");
		tdLabel.appendChild(select);
		conditionButton.appendChild(tdLabel);

		/** select for devices
	  	* creteDeviceSelect will initialize dataArray.triggers for device and deviceState
	  	* 'onchange' functions will also update these values
 	  	*/	
		const deviceVisible = (this.dataArray.triggers[triggerID].action == 'device' ) ? true:false;
		const conditionDevice = this.createDeviceSelect(this.dataArray.triggers[triggerID],
														`condition_device_${triggerID}`,	// reference ID
														deviceVisible						// visible or not
		);

		// add options for timeofday
		const conditionTime = createElem("tr");

		conditionTime.id = `condition_time_${triggerID}`;
		if (this.dataArray.triggers[triggerID].action !== 'time')
			conditionTime.style.display = 'none';

		conditionTime.appendChild(this.createTDLabel("Time:", `trigger_time_hour_${triggerID}`));

		// hour select		
		tdLabel = createElem("td");
		select = createElem("select", { id: `trigger_time_hour_${triggerID}`, style: { width:"auto" }});
		let selHour = -1;
		let selMin = -1;
		if (this.dataArray.triggers[triggerID]?.time) {
			selHour = this.dataArray.triggers[triggerID].time.substr(0,2);
			selMin = this.dataArray.triggers[triggerID].time.substr(3,2);
		}
		select.appendChild(this.buildSelectTime(0,23,'h',selHour));
		// hour change
		select.onchange = (event) => {
			this.dataArray.triggers[triggerID].time = this.buildTimeOfDay(triggerID);
		}
		tdLabel.appendChild(select);
		tdLabel.appendChild(document.createTextNode(":"));
		conditionTime.appendChild(tdLabel);

		// minute select
		select = createElem("select", { id: `trigger_time_min_${triggerID}`, style: { width: "auto" }});
		select.appendChild(this.buildSelectTime(0,59,'min',selMin));
		tdLabel.appendChild(select);
		conditionTime.appendChild(tdLabel);

		// minute change
		select.onchange = (event) => {
			this.dataArray.triggers[triggerID].time = this.buildTimeOfDay(triggerID);
		}
		const lineTR = this.createLineWithNumber(triggerID+1, this.deleteTrigger.bind(this), "trigger");

		// insert this new trigger before the "Actions" label and actions itself
		parent = $("triggersTR").parentNode;
		parent.insertBefore(lineTR,$("triggersTR"));
		lineTR.insertAdjacentElement("afterend", condition);
		condition.insertAdjacentElement("afterend", conditionButton);
		conditionButton.insertAdjacentElement("afterend", conditionDevice);
		conditionDevice.insertAdjacentElement("afterend", conditionTime);

		if (setVisible) {
			// move to first option of this trigger condition
			const goCondition = `#condition_${triggerID}`;
			this.ensureVisible(goCondition);
		}
		this.setSaveButton();
	}

	buildTimeOfDay(triggerID) {
		const hour = $(`trigger_time_hour_${triggerID}`).value;
		const min = $(`trigger_time_min_${triggerID}`).value;
		const formattedTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;	
		return formattedTime;
	}

	/*
 	* add action
 	* all options are added here: Device, Scene, Delay
 	* option shown depends on option selected on selectAction
 	* only selected option is shown, the others are hidden
 	*/
	addAction() {
		const actionID = ++this.actionNumber;
		if (!this.dataArray.actions)
			this.dataArray.actions = [];

		// init the action for this actionID
		// device init will be done in createDeviceSelect
		this.dataArray.actions[actionID-1] = { action : "device", device : "", deviceState : "", scene: "", delay: 1 };
		this.appendActionOnScreen(actionID-1);
	}

	createTDLabel(labelText, forID) {
		let tdLabel = createElem("td");
		let label = createElem("label", { text: labelText });
		label.setAttribute("for", forID);
		tdLabel.appendChild(label);
		return tdLabel;
	}

	appendActionOnScreen(actionID, setVisible = true) {
		// action select ( device, scene, delay )
		const forID = `not_used_action_id${actionID}`;
		const action = createElem("tr", { id: `action_${actionID}`});
		action.appendChild(this.createTDLabel("Action:", forID));

		// add actions select ( device, scene, delay )
		const tdSelect = createElem("td");
		tdSelect.style.setProperty("width", "60%", "important");
		let selectAction = createElem("select", { id: forID });

		// show selected option, device/scene/delay
		selectAction.onchange = (event) => {
			this.setSelectedAction(actionID, event.target.value);
		};

		// select options
		const options = [
			{ value: "device", text: "Device" },
			{ value: "scene", text: "Scene" },
			{ value: "delay", text: "Delay" }
		];

		// add options to the select
		options.forEach(opt => {
			const option = createElem("option", { text: opt.text });
			option.value = opt.value;
			if (this.dataArray.actions[actionID].action == opt.value)
				option.selected = true;
			selectAction.appendChild(option);
		});

		tdSelect.appendChild(selectAction);
		action.appendChild(tdSelect);

		/** option for devices
	  	* createDeviceSelect will initialize dataArray.actions for device and deviceState
	  	* 'onchange' functions will also update those values
 	  	*/	
		const actionDevice = this.createDeviceSelect( this.dataArray.actions[actionID],	// actionID,
													  `action_device_${actionID}`,
													  true,true);

		const sceneSelect = this.createSceneSelect(	`action_scene_${actionID}`,
													this.dataArray.actions[actionID], 
													false);
	
		// add options for delay
		const delayTime = createElem("tr", { id: `action_delay_${actionID}`, style: { display: "none" }});
		delayTime.appendChild(this.createTDLabel("Delay:", `delay_time_sec_${actionID}`));

		// hour select
		const tdLabel = createElem("td");
		const select = createElem("select", { id: `delay_time_sec_${actionID}`, style: { width: "auto" }});
		select.appendChild(this.buildSelectTime(1,30,'s',this.dataArray.actions[actionID].delay));

		// delay time change
		select.onchange = (event) => {
			this.dataArray.actions[actionID].delay = event.target.value
		};

		tdLabel.appendChild(select);
		delayTime.appendChild(tdLabel);
	
		// separator line with action number
		const lineTR = this.createLineWithNumber(actionID+1, this.deleteAction.bind(this), "action");

		// insert this new trigger before the "endingTR" 
		const parent = $("actionsTR").parentNode;
		parent.insertBefore(lineTR,$("actionsTR"));
		lineTR.insertAdjacentElement("afterend", action);
		action.insertAdjacentElement("afterend", actionDevice);
		actionDevice.insertAdjacentElement("afterend", delayTime);
		delayTime.insertAdjacentElement("afterend", sceneSelect);

		this.setSelectedAction(actionID, this.dataArray.actions[actionID].action);
		if (setVisible) {
			const goAction = `#action_${actionID}`;
			this.ensureVisible(goAction);
		}
		this.setSaveButton();
	}

	setSelectedAction(actionID, selectedValue) {
		$(`action_device_${actionID}`).style.display = "none";
		$(`action_scene_${actionID}`).style.display = "none";
		$(`action_delay_${actionID}`).style.display = "none";

		switch (selectedValue) {
			case 'device':
				$(`action_device_${actionID}`).style.display = "table-row";
				this.dataArray.actions[actionID].action = "device";
				break;
			case 'scene':
				$(`action_scene_${actionID}`).style.display = "table-row";
				this.dataArray.actions[actionID].action = "scene";
				break;
			case 'delay':
				$(`action_delay_${actionID}`).style.display = "table-row";
				this.dataArray.actions[actionID].action = "delay";
				break;
		}
	}

	// ensure that element 'goAction' is visible on screen
	ensureVisible(goAction) {
		const element = document.querySelector(goAction);
		if (!element)
			return;

		const rect = element.getBoundingClientRect();
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		const isFullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight;

  		if (!isFullyVisible) 
	    	element.scrollIntoView({ behavior: "smooth", block: "center" });
 	}

	// scene select
	createSceneSelect(ID, dataArray, visible) {
		const scene = createElem("tr", { id: ID })
		scene.style.display = visible ? 'table-row':'none'
		scene.appendChild(this.createTDLabel("Scene:", `not_used_scene${ID}`));

		// add scenes
		const tdLabel = createElem("td");
		const select = this.getScenesSelect(dataArray);
		select.id = `not_used_scene${ID}`;

		tdLabel.appendChild(select);
		scene.appendChild(tdLabel);
		select.onchange = (event) => {
			this.dataArray.scene = event.target.value;
		}
		return scene;
	}

	//select with every existing device
	createDeviceSelect( workingOnArray,
						conditionID, 	
						visible, 
						toggleOption=false) {

		const conditionDevice = createElem("tr")
		conditionDevice.id = conditionID;
		conditionDevice.style.display = visible ? 'table-row':'none'
		conditionDevice.appendChild(this.createTDLabel("Device:", `not_used_device_${conditionID}`));

		/** create select for workingOnArray with all existing devices **/
		let tdLabel = createElem("td");
		const select = this.getDevicesSelect(workingOnArray);
		select.id = `not_used_device_${conditionID}`;
		tdLabel.appendChild(select);

		// ON/OFF/Toggle select
		const stSelect = createElem("select");
		const opton = createElem("option", { text: "ON", value: "ON"});
		const deviceState = workingOnArray.deviceState;
		opton.selected = (deviceState === "ON");
		stSelect.appendChild(opton);

		const optoff = createElem("option", { text: "OFF", value: "OFF"});
		optoff.selected = (deviceState === "OFF");
		stSelect.appendChild(optoff);

		if (toggleOption) {
			const opttoggle = createElem("option", { text: "TOGGLE", value: "TOGGLE"});
			opttoggle.selected = (deviceState === 'TOGGLE');
			stSelect.appendChild(opttoggle);
		}

		const tdST = createElem("td");
		tdST.colspan=2;
		tdST.appendChild(stSelect);

		if (!workingOnArray.deviceState)
			workingOnArray.deviceState = "ON";

		// change for deviceState (ON/OFF)
		stSelect.onchange = function(event) {
			workingOnArray.deviceState = event.target.value;
		};

		conditionDevice.appendChild(tdLabel);
		conditionDevice.appendChild(tdST);
		return conditionDevice;
	}

	// line with a number in a box
	createLineWithNumber(lineNumber, deleteFunction, deleteTitle) {
		const divLine = createElem("div", { classlist: "line-width-number" });
		const divNumber = createElem("div", { classlist: "box-number", text: lineNumber });
		const divLineRight = createElem("div", { classlist: "line", style: { width: "50%" } });
		divLine.appendChild(divNumber);
		divLine.appendChild(divLineRight);

		// delete element
		const deleteImg = createElem("img", { id: `delete_${lineNumber}`, src: "img/remove.png", style: { width: "20px", cursor: "pointer" }});
		deleteImg.title = "Delete "+deleteTitle+" "+lineNumber;
		deleteImg.onclick = () => {
			deleteFunction(lineNumber);
		}
		const deleteTD = createElem("td");
		deleteTD.appendChild(deleteImg);

		const lineTR = createElem("tr")
		const lineTD = createElem("td", { style: { width: "50px"}});
		lineTD.colSpan = 2;
	
		lineTD.appendChild(divLine);
		lineTR.appendChild(lineTD);
		lineTR.appendChild(deleteTD);
		return lineTR;
	}

	// delete trigger row & data
	deleteTrigger(elementID) {
		this.dataArray.triggers.splice (parseInt(elementID)-1,1);
		this.deleteTriggersFromScreen();

		--this.triggerNumber;

		// show existing triggers
		for (var i=0; i<this.dataArray.triggers.length; i++)
			this.appendTriggerOnScreen(i);

		this.setSaveButton();
	}


	/* delete any 'trigger' row on screen
 	* keep <tr> named 'trigger-keepRow'
 	* delete everything inside <tbody> except 'triggerTR' and 'trigger-keepRow'
 	*/
	deleteTriggersFromScreen() {
		const tbody = document.querySelector('#triggers-table tbody');
		const triggersTR = $('triggersTR');
		const keepRow = $('trigger-keepRow');
		const rows = Array.from(tbody.querySelectorAll('tr'));

		for (let row of rows) {
  			if (row === keepRow) 
				continue;
  			if (row === triggersTR) 
				break;
  			tbody.removeChild(row);
		}
	}

	// delete action row & data
	deleteAction(elementID) {
		this.dataArray.actions.splice (parseInt(elementID)-1,1);
		this.deleteActionsFromScreen();

		--this.actionNumber;

		// show existing actions
		for (var i=0; i<this.dataArray.actions.length; i++)
			this.appendActionOnScreen(i);

		this.setSaveButton();
	}

	/* delete every 'action' rows from screen
 	* keep <tr> named 'action-keepRow'
 	* delete everything inside <tbody> except 'actionTR' and 'action-keepRow'
 	*/
	deleteActionsFromScreen() {
		const tbody = document.querySelector('#actions-table tbody');
		const actionsTR = $('actionsTR');
		const keepRow = $('action-keepRow');
		const rows = Array.from(tbody.querySelectorAll('tr'));

		for (let row of rows) {
  			if (row === keepRow) 
				continue;
  			if (row === actionsTR) 
				break;
  			tbody.removeChild(row);
		}
	}

	// build a select with existing RF buttons
	createButtonsSelect(buttonArray) {
		const select = createElem("select");
		select.onchange = function(event) {
			buttonArray.button = event.target.value;
		}

		if (typeof config == 'undefined' || !config?.dHouse?.buttons) {
			const option = createElem("option", { text: "-Buttons not defined-" });
			option.disabled = true;
			option.selected = true;
			select.appendChild(option);
			select.style.backgroundColor = "#ddd";
			return select;
		}

		// list of existing buttons
		const buttons = config.dHouse.buttons;
		let getFirst = true;
		for (const button of buttons) {
	  		const key = Object.keys(button)[0];
			const option = createElem('option', { value: key, text: button[key] });
			select.appendChild(option);
			option.selected = buttonArray.button == key;

			if (buttonArray.button == "")
				buttonArray.button = key;

			getFirst = false;
		}
		return select;
	}

	// build a select with existing devices
	// workingOnArray = trigger[ID] or action[ID]
	getDevicesSelect(workingOnArray) {
		/** workingOnArray.device format:
	 	** single switch = tasmota_abcd
	 	** multiple switch = tasmota_abcd:switch_n
	 	**/
		const select = createElem("select");
		select.onchange = function(event) {
			workingOnArray.device = event.target.value;
		};

		if (typeof config == 'undefined' || !config?.dHouse?.devices) {
			const option = createElem("option", { text: "- Devices not defined -" });
			option.disabled = true;
			option.selected = true;
			select.appendChild(option);
			select.style.backgroundColor = "#ddd";
			return select;
		}

		/** this is the currently data selected for the device 
	 	** currentDev.device could be null if nothing is selected yet
     	**/
		const currentDev = splitMultiDevice(workingOnArray.device);

		// list of existing devices
		let setFirst = true;
		Object.keys(devices).forEach(dev => {
			if (devices[dev].ModuleType !== BRIDGE_MODULE) {
	
				/** if this device has more than one power switch
		  	  	* all switches name will be shown 
		 	 	**/	

				if (devices[dev].PowerControls > 1)	{
					// get every switch_x & name
					const switches = Object.keys(devices[dev])
	  					.filter(key => /^switch_\d+$/.test(key))
  						.map(key => ({ key:key, value: devices[dev][key] })
					);
					// build option for a device with multiple power switch -> dev:switch_x - name
					switches.forEach( ({key, value}) => {
						const option = createElem('option');
						const optionValue = `${dev}:${key}`;	// tasmota_abcds:switch_1
	
						if (setFirst) {
							if (workingOnArray.device == "")
								workingOnArray.device = optionValue;
							setFirst = false;
						}

		   				option.value = optionValue;
   						option.textContent = value;	
						if (currentDev.device == dev && currentDev.switchStr == key) {
							option.selected = true;
						}
						select.appendChild(option);
					});
				}
				else {
					// build option for a device with single powerSwitch
				
					if (setFirst) {
						if (workingOnArray.device == "")
							workingOnArray.device = dev;
						setFirst = false;
					}

					const option = createElem('option', { value: dev, text: devices[dev].FriendlyName });
					if (currentDev.device == dev && currentDev.switchNumber == 0)
						option.selected = true;
					select.appendChild(option);
				}
			}
		});
		return select;
	}

	// build a select with existing devices
	getScenesSelect(dataArray) {
		const select = createElem("select");
		const count = Object.keys(this.scenesArray).length;
		if (count == 0) {
			const option = createElem("option", { text: "- Scenes not defined -" });
			option.disabled = true;
			option.selected = true;
			select.appendChild(option);
			select.style.backgroundColor = "#ddd";
			return select;
		}

		// list of existing scenes
		let firstValue = true;
		Object.keys(this.scenesArray).forEach(scene => {
			// set first value in select data if empty
			if (firstValue)
				if (this.dataArray.scene == "")
					this.dataArray.scene = scene;
			firstValue = false;

			const option = createElem('option', { value: scene, text: scene});
			select.appendChild(option);
		});
		return select;
	}

	cancelAddScene() {
		this.waitingRemoteButton = false;
		$('add_scene_section').style.display = 'none';
		$('add-scene').disabled = false;
		$('scenes-section').style.display='block';
		$("scenes-table").innerHTML = "";

		this.showScenesTable();

		$('back-image')?.removeEventListener("click", this.cancelAddScene);	
		$('back-image')?.addEventListener("click", this.goBackIndex);
	}

	findDuplicatedDevices(searchArray) {
		let seenDevices = new Set();
		let hasDuplicates = false;

		for (let i=0; i<searchArray.length; i++)  {
			if (searchArray[i].action === 'device') {
	        	let device = searchArray[i].device;
        		if (seenDevices.has(device)) {
		            hasDuplicates = true;
            		break; 
        		}
        		seenDevices.add(device);
			}
    	}
		return hasDuplicates;
	}

	// store view/hide shortcut in menu bar for current user
	storeUserdataShortcut(sceneName) {
		const showShortcut = $("show-shortcut").checked;
		const userData = loadUserData()
			.then(data => {
				let dataArray = {};
				if (data !== "")
					dataArray = JSON.parse(data);

				if (!dataArray[dhouse_user])
					dataArray[dhouse_user] = {};
				if (!dataArray[dhouse_user]['hide_shortcut'])
					dataArray[dhouse_user]['hide_shortcut'] = [];
		
				if (!showShortcut) {
					// user does not want to see the shortcut, add it to the "hide_shortcut" user array
					dataArray[dhouse_user]['hide_shortcut'].push(sceneName);
				}
				else {
					// remove scene from "hide_shortcut" if already selected
					if (dataArray[dhouse_user]['hide_shortcut']) {
						const index = dataArray[dhouse_user]['hide_shortcut'].indexOf(sceneName);
						if (index != -1)
							dataArray[dhouse_user]['hide_shortcut'].splice(index,1);
					}
				}

				const ret = storeUserInServer(dataArray)
				.then(ret => {
					if (ret !== "store: done")
						showMessage("Could not store user data.<br>Verify [config] folder permissions.","User settings");
				});
			});
	}

	// validate and save scene data
	async saveScene() {
		let enableSave = false;

		// validate only one button
		const triggers = this.dataArray.triggers;
		if (!triggers || triggers.length == 0) {
			showMessage ("There are no triggers defined.<br>Please add triggers.","Scenes");
			return;
		}
		if (this.findDuplicatedDevices(triggers)) {
			showMessage("The <b>same device for Triggers</b> has been selected more than once.<br>Please select every device only one time.","Scenes");
			return;
		}
	
		const actions = this.dataArray.actions;
		if (!triggers || triggers.length == 0) {
			showMessage ("There are no actions defined.<br>Please add actions.","Scenes");
			return;
		}

		let sceneName = $('scene-name').value.trim();
		if (sceneName == "") {
			showMessage("Please specify a name for the scene","Scenes");
			return;
		}

		// only one button and one time of day for triggers
		let buttonsCount = 0;
		let timeOfDayCount = 0;

		for (var i=0; i<triggers.length; i++) {
			if (triggers[i].action == 'button')
				++buttonsCount;
			if (triggers[i].action == 'time')
				++timeOfDayCount;
		}
		if (buttonsCount > 1) {
			showMessage("More than <b>one button</b> is selected for Triggers.<br>Please select only one button.","Scenes");
			return;
		}

		// check device duplicates in actions
		if (this.findDuplicatedDevices(actions)) {
			showMessage ("The same device for <b>Actions</b> has been selected more than once.<br>Please select every device only one time.","Scenes");
			return;
		}

		if (timeOfDayCount > 1) {
			showMessage ("Only <b>one Time of day</b> is allowed for triggers.<br>Set only one Time of day.","Scene");
			return;
		}

		this.scenesArray[sceneName] = this.dataArray;
		this.scenesArray[sceneName].enable = $("enable-scene").checked ? 1:0;

		let result = "";
		try {
			result = await storeScenesInServer(this.scenesArray);
		} catch (error) {
			console.log ("store error");
			await showMessage ("Could not store scenes file", "Scenes");
			return;
		}

		if (result != 'store: done') 
			await showMessage ("Could not store scenes file.<br>Check [config] folder permissions.","Scenes");
		else {
			// store view/hide shortcut in menu bar for current user
			// reload service configuration to update scenes
			this.storeUserdataShortcut(sceneName);
			reload_dHouseService(this.mqttClient);
			showMessage ("Scene successfully saved","Scenes");
		}
		loadScenes();
	}

	// user changed scene name text
	userEditSceneName() {
		this.setSaveButton();
	}

	setSaveButton() {
		let enableSave = false;
		if ($('scene-name').value.trim() !== "" && this.triggerNumber > 0 && this.actionNumber > 0)
			enableSave = true;
		
		// validate that trigger & action has at least 1 value
		$("save-button").disabled = !enableSave;	
	}

	// show table for edit/delete scenes
	showScenesTable() {
		const count = Object.keys(this.scenesArray).length;
		if (count == 0) 
			return;
	
		const scenesTable = $("scenes-table");
		Object.keys(this.scenesArray).forEach(scene => {
			const tr = createElem("tr");
			let td;

			// run this scene
			const runImg = createElem("img", { src: "img/run.png", title: "Run scene", class: "iconPointer"});
			runImg.onclick = ((event) => {
				this.runScene(scene, event);
			});
			td = tr.insertCell();
			td.appendChild(runImg);

			td = tr.insertCell();
			td.style.width='60%';
			td.style.cursor = "pointer";
			td.innerHTML = scene;
		
			if (this.scenesArray[scene].enable == 0) {
				td.style.color = "#cacaca";
			}

			// scene name, edit on click
			td.title = "Edit scene";
			td.onclick = ((event) => {
				this.loadScene(scene);
			});

			// edit scene
			td = tr.insertCell();
			let img = createElem("img", { src: 'img/edit.png', title: "Edit Scene", class: "iconPointer" });
			img.onclick = () => {
				this.loadScene(scene);
			};
			td.appendChild(img);

			// remove scene
			td = tr.insertCell();
			img = createElem("img", { src: 'img/remove.png', title: "Delete scene", class: "iconPointer" });
			img.onclick = () => {
				this.deleteScene(scene);
			};
			// td.innerHTML = "<img src='img/settings.png'>";
			td.appendChild(img);
			scenesTable.appendChild(tr);	
		});
	}

	async deleteScene(sceneName) {
		if (!await showConfirm("Delete scene: " + sceneName + " ?", "Scene"))
			return;

		const scenes = await loadScenes();
		if (scenes=="") {
			showMessage("Could not load scenes, unknown error","Scenes");
			return;
		}

		this.scenesArray = JSON.parse(scenes);
		delete this.scenesArray[sceneName];

		const scenesTable = $("scenes-table");
		scenesTable.innerHTML = "";
		this.showScenesTable();

		const result = await storeScenesInServer(this.scenesArray);
		// reload service configuration to update memory scenes
		reload_dHouseService(this.mqttClient);
	}

	setAllButtonImagesDisplay(display) {
		for (i=0; i<3; i++) {
			const imageToShow = `remote_img_${i}`;
			$(imageToShow).style.display = display;
		}
	}

	// add a new scene
	addScene() {
		this.deleteTriggersFromScreen();
		this.deleteActionsFromScreen();

		this.dataArray = {};
		this.dataArray.triggers = [];
		this.dataArray.actions = [];
		this.triggerNumber = 0;
		this.actionNumber = 0;
	
		$('scene-name').value = "";
		$('enable-scene').checked = true;
		$("show-shortcut").checked = true;
		$('scenes-section').style.display='none';
		$('add_scene_section').style.display = 'block';
		document.querySelector("#add_scene_section").scrollIntoView({ behavior: "smooth" });	

		// remap back button
		$('back-image')?.removeEventListener("click", this.goBackIndex);
		$('back-image')?.addEventListener("click", () => this.cancelAddScene());
	}

	// set show shortcut in menu bar for this scene/current user
	setSceneShortcut(sceneName) {
		const userData = loadUserData()
			.then(data => {
				if (data !== "") {
					let dataArray = JSON.parse(data);
					if (dataArray?.[dhouse_user]?.['hide_shortcut']) {
						const index = dataArray[dhouse_user]['hide_shortcut'].indexOf(sceneName);
						if (index != -1) {
							// scene is listed in hide scene shortcut
							$("show-shortcut").checked = false;
							return;
						}
					}
				}
			});
		$("show-shortcut").checked = true;
	}

	// load scene from scene.config file
	async loadScene(sceneName) {
		const scenes = await loadScenes();
		if (scenes=="") {
			showMessage ("Could not load the required scene");
			return ;
		}
		const allScenes = JSON.parse(scenes);
		if (!allScenes[sceneName]) {
			showMessage ("The required scene was not found");
		}

		// override memory scenesArray with the required scene
		this.dataArray = {};
		this.dataArray.triggers = {};
		this.dataArray.actions = {};
		this.dataArray.triggers = allScenes[sceneName].triggers;
		this.dataArray.actions = allScenes[sceneName].actions;

		$('scene-name').value = sceneName;
		$('enable-scene').checked = allScenes[sceneName].enable == 1;
		$('scenes-section').style.display='none';
		$('add_scene_section').style.display = 'block';

		// set show shortcut in menu bar for this scene
		// show shortcut depends on current user
		this.setSceneShortcut(sceneName);
		this.deleteTriggersFromScreen();
		this.deleteActionsFromScreen();

		// show existing triggers
		if (this.dataArray.triggers) {
			this.triggerNumber = this.dataArray.triggers.length;
			for (var i=0; i<this.dataArray.triggers.length; i++)
				this.appendTriggerOnScreen(i, false);
		}

		// show existing actions
		if (this.dataArray.actions) {
			this.actionNumber = this.dataArray.actions.length;
			for (var i=0; i<this.dataArray.actions.length; i++)
				this.appendActionOnScreen(i, false);
		}
		// remap back button
console.log ("remaped");
		$('back-image')?.removeEventListener("click", this.goBackIndex);
		$('back-image')?.addEventListener("click", () => this.cancelAddScene());
	}

	runScene(name, event) {
		this.mqttClient.sendDHouseCommand(CMD_RUN_SCENE, name);
		showMessage(`Running scene <b>${name}</b>`,"Scenes",event);
	}

	startMqttConnection() {
    	this.mqttClient.mqttConnect();
	}

	startPage() {
		this.startMqttConnection();
	}

	goBackIndex() {
		window.history.back();
	}

	setupNavigation() {

		// override main go back to be able to change it here
		$('back-image')?.removeEventListener("click", backPageHandler);
		$('back-image')?.addEventListener("click", this.goBackIndex);	

 		$('add-scene')?.addEventListener("click", () => this.addScene());
 		$('close-add-scene')?.addEventListener("click", () => this.cancelAddScene());
		$('save-button')?.addEventListener("click", () => this.saveScene());
		$('button-add-trigger')?.addEventListener("click", () => this.addTrigger());
		$('button-add-action')?.addEventListener("click", () => this.addAction());
		$('scene-name')?.addEventListener("onchange", () => this.userEditSceneName());
	}

};

// called from init_page after configuration is retrieved
function startPage() {
	editScenes.startPage();
}

document.addEventListener("DOMContentLoaded", async function() {
	editScenes = new editScenesClass();

	// load existing scenes
	const scenes = await loadScenes();
	if (scenes!=="") 
		editScenes.scenesArray = JSON.parse(scenes);

	editScenes.showScenesTable();
	editScenes.setupNavigation();
});



