// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

"use strict"

let log;

class logDataClass {

	static linesPerPage = 15;

	constructor () {
		this.currentPage = 0;
		this.todayDate = "";
	}

	noDataAvailable(friendlyName) {
		const logData = $('log-data');
		logData.innerHTML = "<b>" + friendlyName + "</b><br><br>";
		logData.innerHTML += "No data available";
		logData.style.display = 'block';
		$('prev-button').style.display = 'none';
		$('next-button').style.display = 'none';
		$('remove_log').style.display = 'none';
	}

	// TODO: split in small parts
	showSqlData(data, friendlyName) {
		const logData = $('log-data');
		logData.innerHTML = "<b>" + friendlyName + "</b><br><br>";

		const select = $('device-list');
		const showAllDevices = (select.value == 'all')

		if (data.length == 0) {
			this.noDataAvailable(friendlyName);
			return;
		}

		if (select.value == 'all')
		 	 $('remove_log').style.display = 'none';
		else $('remove_log').style.display = 'block';

		// build a table with resulting rows
		const table = createElem("table", { style: { width: "max-content", borderCollapse: "collapse" }});
		//table.style.width = "max-content";
		//table.style.borderCollapse = "collapse";
	
		data.forEach(row => {
			const tr = createElem("tr");		
			for (const [key, value] of Object.entries(row)) {

				if (key == 'device' || key == 'command') 
					continue;	// will be shown in friendlyName

				let tdData = value;
				let switchData = '';

				if (key == 'data' && row['command'] == 'UPDATE') {
					let td = createElem("td");
					td.textContent = "UPDATE: " + tdData;
					tr.appendChild(td);
					continue;
				}

				// place a mark over today date
				if (key == 'date' && value.startsWith(this.todayDate)) {
					let td = tr.insertCell();
					td.style.backgroundColor = "#feaa";
					td.style.textAlign = "center"; 
					let text = document.createTextNode(value.substr(11));
					td.appendChild(text); 
					continue;
				}

				if (key != 'friendlyName') {
					// just show this column (date, origin, etc)
					let td = createElem("td");
					td.textContent = tdData;
					tr.appendChild(td);
					continue;
				}

				// friendly name column
				if (row['command'] == "UPDATE") {
					switchData = row['friendlyName'];
					if (!showAllDevices) {
						// don't show friendlyName nor switchName because we are precisely listing
						// this device
						let td = createElem("td");
						tr.appendChild(td);
						continue;
					}
				}
				else {
		
					/* if this is a multi switch device then show the switch name instead friendlyname
			     	* switch name comes from config.dHouse.devices[device].switch_n
			     	* convert POWER / POWER(1) / POWER(2) ...etc  in a switch number				
				 	*/
					const match = row['command'].match(/^POWER(?:\((\d+)\))?$/);
 					if (match) {
						// we have 'POWER' / 'POWER(1)' / 'POWER(n)'
						const number = match[1] ?? '';
						if (number) {
							const switchID = `switch_${number}`;
							const device = row['device'];
							if (config?.dHouse?.devices) {
								switchData = config.dHouse.devices[device][switchID] ? config.dHouse.devices[device][switchID]:switchID;
									if (switchData == switchID && showAllDevices) {
									// add friendlyName to known which device is the owner of the switch
									switchData = row['friendlyName'] + ":" + number; // switchData;
								}
							}
						}
						else {
							// this is a single power switch device
							if (!showAllDevices) {
								// don't show friendlyName nor switchName because we are precisely listing
								// this device
								tr.appendChild(createElem("td"));
								continue;
							}
						}
					}
					// show friendlyName or switch name
					tdData = switchData !== '' ? switchData:value;
				}

				let td = createElem("td", { text: tdData });
				//td.textContent = tdData;
				tr.appendChild(td);
			}
			table.appendChild(tr);

		});
		logData.appendChild(table);
		logData.style.display = 'block';

		// show/disable next and previous buttons
		$('prev-button').style.display = (this.currentPage > 0) ? 'block':'none';
		$('next-button').style.display = (data.length >= logDataClass.linesPerPage) ? 'block':'none';
	}

	sqlError(error) {
		const logData = $('log-data');
		logData.innerHTML = "<b>SQL Error:</b> " + error + "<br>Verify that Sqlite3 is installed and log table is under [db] folder.";
		logData.style.display = 'block';
	}

	getSqlData(device, friendlyName) {
		const query = `php/get_log_data.php?device=${device}&offset=${this.currentPage}&limit=${logDataClass.linesPerPage}`;
		console.log (query);
		fetch(query)
		.then(response => response.text())
		.then(data => {
			try {
				data = JSON.parse(data);
   				this.showSqlData(data, friendlyName);
			}
			catch (error) {
				console.log (error);
				this.noDataAvailable(friendlyName);
				this.sqlError(data);
			}
		})
		.catch(error => {
			this.noDataAvailable(friendlyName);
			this.sqlError(error);
		});
	}

	deleteSqlData(device) {
		const query = `php/delete_log_data.php?device=${device}`;
		return fetch(query)
			.then(response => response.text())
			.catch(error => {
				this.sqlError(error);
				throw error; 
			});
	}

	previousPage() {
		const select = $('device-list');
		const device = select.value;
		const friendlyName = (device == 'all') ? 'All devices':devices[device].FriendlyName;
		this.currentPage -= logDataClass.linesPerPage;
		this.getSqlData(device, friendlyName);
	}

	nextPage() {
		const select = $('device-list');
		const device = select.value;
		const friendlyName = (device == 'all') ? 'All devices':devices[device].FriendlyName;
		this.currentPage += logDataClass.linesPerPage;
		this.getSqlData(device, friendlyName);
	}

	// delete all sql data for the selected device
	async deleteDeviceLog() {
		const select = $('device-list');
		const device = select.value;
		const friendlyName = (device == 'all') ? 'All devices':devices[device].FriendlyName;
	
		if (device == 'all')
			return;

		if (!await showConfirm(`Delete all log data for <b>${friendlyName}`))
			return;

		await this.deleteSqlData(device);
		this.currentPage = 0;
		this.getSqlData(device, friendlyName);
	}

	// add existing devices to 'device-list'
	setDeviceList() {
		const select = $('device-list');
		if (typeof devices !== 'undefined' && devices) {
			Object.keys(devices).forEach(dev => {
				if (devices[dev].ModuleType !== BRIDGE_MODULE) {
					const option = createElem('option', { text: devices[dev].FriendlyName });
    				option.value = dev;
    				//option.textContent = devices[dev].FriendlyName;
					select.appendChild(option);
				}
			});
		}
		else {
			select.style.backgroundColor = "#ddd";
			const option = createElem('option', { text: "-Devices not defined-" });
			// option.textContent = "-Devices not defined-";
			option.disabled = true;
			option.selected = true;
			select.appendChild(option);
		}
	}

	changeDevice(ev) {
		if (ev.value == '')
			return;

		const device = ev.value;
		const friendlyName = (device == 'all') ? 'All devices':devices?.[device]?.FriendlyName ?? '';

		// reset page counter to get first data page
		this.currentPage = 0;
		this.getSqlData(device, friendlyName);
	}

	startPage () {
		this.setDeviceList();
		// force first time display of all log data
		const ev = {};
		if (device != '') {
			$('device-list').value = device;
			ev.value = device;
		}
		else
			ev.value = 'all';
		this.changeDevice(ev);
	}

	refreshLog() {
		const select = $('device-list');
		const device = select.value;
		const friendlyName = (device == 'all') ? 'All devices':devices[device].FriendlyName;
		this.getSqlData(device, friendlyName);
	}

	setupNavigation() {
		$('remove_log')?.addEventListener("click", () => this.deleteDeviceLog());
		$('refresh_log')?.addEventListener("click", () => this.refreshLog());	
		$('prev-button')?.addEventListener("click", () => this.previousPage());
		$('next-button')?.addEventListener("click", () => this.nextPage());

		$('device-list')?.addEventListener('change', (event) => {
			this.changeDevice(event.target);
		});
	}
};

// called from init_page after configuration is retrieved
function startPage() {
	log.startPage();
}

document.addEventListener("DOMContentLoaded", () => {
	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
	const dd = String(today.getDate()).padStart(2, '0');

	log = new logDataClass;
	log.todayDate = `${yyyy}-${mm}-${dd}`;
	log.setupNavigation();
	
});


