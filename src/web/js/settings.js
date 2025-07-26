// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let settings;

class settingsClass {

	constructor() {
	}

	saveUserSettings() {
		const showScenesBar = $("show_scenes_bar").checked;	
		const userData = loadUserData()
		.then(data => {
			let dataArray = {};
			if (data !== "")
				dataArray = JSON.parse(data);

			if (!dataArray[dhouse_user])
				dataArray[dhouse_user] = {};
			dataArray[dhouse_user]["showScenesBar"] = showScenesBar;

			const ret = storeUserInServer(dataArray)
			.then(ret => {
			if (ret !== "store: done")
				showMessage("Could not store user data.<br>Verify [config] folder permissions.","User settings");
			});
		});
	}

	async saveSettings() {
		const showAverage = $('show_average');
		const setHostname = $('set_hostname');
		const sleepTime = $('sleep_time');
		const latitude = $('latitude').value;
		const longitude = $('longitude').value;
	
	 	const pattern = /^-?\d*(\.\d+)?$/;
	  	if (!pattern.test(latitude)) {
			showMessage("<b>Latitude</b> value is not correct");
			return;
		}
  		if (!pattern.test(longitude)) {
			showMessage("<b>Longitude</b> value is not correct");
			return;
		}

		if (typeof config == "undefined") {
			if (!await showConfirm("A new configuration will be created\nProceed?", "Settings"))
				return;

			config={};
			config.dHouse = {};
			config.dHouse.configuration = {};
		}

		const { configuration } = config.dHouse;

		configuration.dhouse_name = $("dhouse_name").value;	
		configuration.showAverage = showAverage.checked ? true:false;
		configuration.setHostname = setHostname.checked ? true:false;
		configuration.latitude = latitude;
		configuration.longitude = longitude;
		configuration.timezone = $('timezone').value;

		if (set_sleep_time)
			configuration.defaultSleepTime = sleepTime.value;

		try {
			const ret = await storeConfigurationInServer();
			if (ret == "store: error")
				await showMessage ("Could not store configuration<br>Check [config] folder permissions", "Settings");
			else {
				this.saveUserSettings();
				await showMessage("Configuration saved", "Settings");
			}
		}
		catch (error) {
			console.log ("error received: " + error);
			await showMessage (error, "Settings");
			return;
		}
	}

	timezone_number(s) {
		if (s == 0)
			return '+00:00';
		if (s > 0) {
			if (s<10)
				return '+0' + s + ':00';
			return '+' + s + ':00';
		}

		if (s>-10)
			return '-0' + Math.abs(s) + ':00';
		return s + ':00';
	}

	setTimezoneValues() {
		const tzSelect=$('timezone');
		// set timezone values
		for (let s=-12; s<=14; s++) {
			const option = createElem("option");
			const tz = this.timezone_number(s);
			if (typeof config !== 'undefined' && config.dHouse.configuration?.timezone && config.dHouse.configuration.timezone == tz)
				option.selected = true;
			option.value = tz;
			option.textContent = tz;
			tzSelect.appendChild(option);
		}
	}

	// set show shortcut in menu bar for this scene/current user
	setShowScenesBar() {
		const userData = loadUserData()
		.then(data => {
			if (data !== "") {
				let dataArray = JSON.parse(data);
				if (dataArray[dhouse_user].hasOwnProperty("showScenesBar")) {
					$("show_scenes_bar").checked = dataArray[dhouse_user]["showScenesBar"];
				}
				else {
					$("show_scenes_bar").checked = true;
				}
				return;
			}
			else {
				console.log ("could not get user data");
			}
		});
	}

	setupNavigation() {
		$('save')?.addEventListener("click", () => this.saveSettings());
		$('close')?.addEventListener("click", () => go_url("index.php"));
	}

};

// called from init_page after configuration is retrieved
function startPage() {
	settings.setTimezoneValues();
	settings.setShowScenesBar();	
	if (typeof config !== 'undefined') {

		const { configuration } = config.dHouse;

		$("dhouse_name").value = configuration?.dhouse_name ?? '';
		$("show_scenes_bar").checked = configuration?.scenesShortcut !== false;

		const showAverage = configuration?.showAverage;
		if (showAverage)
			$('show_average').checked = showAverage;

		const setHostname = configuration?.setHostname;
		if (setHostname)
			$('set_hostname').checked = setHostname;

		if (configuration?.latitude)
			$('latitude').value = configuration?.latitude;
		if (configuration?.longitude)
			$('longitude').value = configuration?.longitude

		if (set_sleep_time) {
			const defaultSleepTime = configuration?.defaultSleepTime;
			if (defaultSleepTime) {
				const sleepTime = $('sleep_time');
				sleepTime.value = defaultSleepTime;
			}
		}
	}
}

document.addEventListener("DOMContentLoaded", function() {
	settings = new settingsClass();
	settings.setupNavigation();
});