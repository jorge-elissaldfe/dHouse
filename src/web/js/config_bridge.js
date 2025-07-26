// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let bridge;

class configBridgeClass {

	deviceOffline = false;
	waitingRemoteButton = false;
	waitingRemoteButtonImageIndex = 0;
	firstReceivedRemoteButtonID = null;

	constructor() {
		this.mqttClient = new mqttTasmota();
		this.setMqttCallbacks();
	}

	setMqttCallbacks() {
		const handlers = [
			[mqttTasmota.TELE_MESSAGE, this.mqttParseTeleMessage],
			[mqttTasmota.DEVICE_OFFLINE, this.mqttDeviceOffline],
  			[mqttTasmota.DEVICE_ONLINE, this.mqttDeviceOnline],
  			[mqttTasmota.CONNECTION_SUCCESS, this.mqttConnectionSuccess],
		];
		handlers.forEach(([topic, handler]) => {
  			this.mqttClient.callbackSubscribe(topic, handler.bind(this));
		});
	}

	// called from mqtt_tasmota 
	mqttParseTeleMessage (topic, message, dev, teleType) {
		if (dev != device)
			return;

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
					this.buttonRfReceived (dataValue);
				break;
  		}
	}

	cancelAddRFButton() {
		this.waitingRemoteButton = false;
		$('add_button_section').style.display = 'none';
		$('add-button').disabled = false;
	}

	// blink remote image if the button is defined
	blinkExistingButton(buttonID) {
		if (!this.searchButtonID(buttonID))
			return;

		const image = $(`img_${buttonID}`);
		image.style.opacity = "0.1";
		setTimeout(() => {
			image.style.opacity = "1";
		}, 300);
	}


	// button RF data was received
	// check this button code ID 3 times to be sure there is no interference
	buttonRfReceived(dataValue) {
		if (!this.waitingRemoteButton) {
			this.blinkExistingButton(dataValue);
			return;
		}

		if (this.firstReceivedRemoteButtonID == null) {
			this.firstReceivedRemoteButtonID = dataValue;
			if (this.searchButtonID(this.firstReceivedRemoteButtonID))
				showMessage ("A button is already defined for this ID<br>Please use a different button","Bridge");
		}

		if (this.firstReceivedRemoteButtonID !== dataValue)
			return ;

		if (this.waitingRemoteButtonImageIndex<3) {
			$("button-id").value += dataValue + " ";
			const imageToShow = `remote_img_${this.waitingRemoteButtonImageIndex}`;
			$(imageToShow).style.display = 'block';
			this.waitingRemoteButtonImageIndex++;
		}

		if (this.waitingRemoteButtonImageIndex == 3) {
			if (this.searchButtonID(this.firstReceivedRemoteButtonID)) {	
				showMessage ("A button is already defined for this ID<br>Please use a different button","Brige");
				return;
			}

			// enable button name input
			$("button-name").disabled = false;
			$("button-name").focus();
			// enable save button
			$("save-button").disabled = false;
			this.waitingRemoteButtonImageIndex++;
		}

		if (this.waitingRemoteButtonImageIndex > 3) {
			// flash the 3 button images to tell we have the code
			this.setAllButtonImagesDisplay('none');
			setTimeout(() => {
	  			this.setAllButtonImagesDisplay('block');
			}, 250);
		}
	}

	// search for a button id in the configuration bridge buttons
	searchButtonID(buttonID) {
		if (!config.dHouse.buttons) 
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

	// store the RF button received
	saveRFButton() {
		const buttonName = $("button-name").value.trim();
		const buttonID = this.firstReceivedRemoteButtonID;

		if (this.searchButtonID(buttonID)) {	
			showMessage ("A button is already defined for this ID<br>Please use a different button","Bridge");
			return;
		}

		if (buttonName == "") {
			showMessage("Please specify a Button Name","Brige");
			return ;
		}

		this.waitingRemoteButton = false;
		$('add_button_section').style.display = 'none';
		$('add-button').disabled = false;
	
		let buttonData = $("buttons-data");
		const section = this.addButtonInfoSection (buttonName,buttonID);
		buttonData.appendChild(section);

		if (!config.dHouse.buttons) 
			config.dHouse.buttons = [];
		config.dHouse.buttons.push( { [buttonID]: buttonName } );
		storeConfigurationInServer();
	}

	// show all buttons defined in configuration
	showExistingButtons() {
		if (!config.dHouse.buttons) 
			return;

		let buttonData = $("buttons-data");
		const buttons = config.dHouse.buttons;
		for (const button of buttons) {
  			const key = Object.keys(button)[0];
  			const name = button[key];
			const section = this.addButtonInfoSection(name, key);
			buttonData.appendChild(section);
  		}
	}

	// create a section with button name
	addButtonInfoSection(buttonName, buttonID) {

		// TODO: replace by "create"
		const section = createElem("section", { id: `section_${buttonID}`, classlist: "container-place",
								    style: { width: "80%", position: "relative"}});

		const imgRemote = createElem("img", { id: `img_${buttonID}`, src: "img/remote-control.png", style: { width: "20px" }});
		section.appendChild(imgRemote);

		const img = createElem("img", { src: "img/cross.png", title: "Delete Button", 
								style: { position: "absolute", top: "10px", right: "10px", 
										 width: "20px", cursor: "pointer", opacity: "0.4" }});

		img.addEventListener("click", (event) => {
			this.deleteButton(buttonName, buttonID);
		});
		section.appendChild(img);

		const placeName = document.createTextNode(buttonName);
		const span = createElem("span");
		span.appendChild(placeName);
		// span.style.fontWeight = "600";
		section.appendChild(span);
		return section;
	}

	async deleteButton(buttonName, buttonID) {
	 	if (!await showConfirm(`Delete button ${buttonName} ?<br>The <b>scenes</b> related to this button wont work again`, "Bridge")) 
			return;

		// delete all buttons
		for (const button of config.dHouse.buttons) {
			const key = Object.keys(button)[0];
			const sectionID = `section_${key}`;
			const section = $(sectionID);
			section.remove();
		}

		const index = config.dHouse.buttons.findIndex(obj => Object.keys(obj)[0] === buttonID);
		if (index != -1)
			config.dHouse.buttons.splice(index, 1);

		this.showExistingButtons();
		this.storeConfigurationInServer();
	}

	mqttDeviceOffline(dev) {
		if (dev !== device) 
			return;

		/** disable options **/
		this.deviceOffline = true;
		$("add-button").disabled = true;
		$("user-message").innerHTML = "<center>Device is not connected</center>";
		$("user-message").style.display = "block";
	}

	mqttDeviceOnline(dev) {
		if (dev !== device)
			return;

		this.deviceOffline = false;
		$("user-message").style.display = "block";
	}

	setAllButtonImagesDisplay(display) {
		for (let i=0; i<3; i++) {
			const imageToShow = `remote_img_${i}`;
			$(imageToShow).style.display = display;
		}
	}

	// add a new RF button
	addUserRFButton() {
		$('add_button_section').style.display = 'block';
		document.querySelector("#add_button_section").scrollIntoView({ behavior: "smooth" });	
		$('add-button').disabled = true;
		$("button-id").value = "";
		$("button-name").value = "";
		$("save-button").disabled = true;

		this.waitingRemoteButton = true;	
		this.waitingRemoteButtonImageIndex = 0;
		this.firstReceivedRemoteButtonID = null;
		this.setAllButtonImagesDisplay('none');
	}

	// request dhouse proxy online devices	
	mqttConnectionSuccess() {
		this.mqttClient.publish("cmd/dHouse/proxy","DevicesStatus");
	}

	startMqttConnection() {	
    	this.mqttClient.mqttConnect();
	}

	setupNavigation() {
		$("settings-image")?.addEventListener("click", () => go_url(`config_tasmota.php?device=${device}`));
		$("save-button")?.addEventListener("click", () => this.saveRFButton());
		$("cancel-button")?.addEventListener("click", () => this.cancelAddRFButton());
		$("add-button")?.addEventListener("click", () => this.addUserRFButton());
	}
};

// called from init_page after configuration is retrieved
function startPage() {
	bridge.startMqttConnection();
	bridge.showExistingButtons();
}

document.addEventListener("DOMContentLoaded", function() {
	bridge = new configBridgeClass();
	bridge.setupNavigation();
});
