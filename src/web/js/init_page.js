// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let config;
let devices;

document.addEventListener("DOMContentLoaded", async () => { 

	document.getElementById('main-icon')?.addEventListener("click", () => go_url("/"));
	if (typeof DHOUSE_CONFIG!=='undefined') {
		let conf = "";
		try {
			conf = await get_url_content(DHOUSE_CONFIG);
		}
		catch (err) {
			alert ("Could not get dHouse configuration: " + DHOUSE_CONFIG);
		}
		if (conf) {
			config = JSON.parse(conf);
			devices = config.dHouse.devices;
			document.title = config.dHouse.configuration.dhouse_name;
		}
	}

	if (typeof startPage === 'function')
		startPage();
});