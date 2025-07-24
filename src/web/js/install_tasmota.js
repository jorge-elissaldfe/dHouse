// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let installTasmota;

class installTasmotaClass {

	helpInstallTasmota() {
		$("install-help").style.display = "block";
		$("install-main").style.display = "none";
	}

	ip2long(ip) {
		return ip.split('.').reduce((acc, octet) => {
			return (acc << 8) + parseInt(octet, 10);
		}, 0) >>> 0;
	}

	// search in a IP range
	async performSearchIPRange() {

		const search_from = $('search-from').value;
		const search_to = $('search-to').value;
		localStorage.setItem("search_from", search_from);
		localStorage.setItem("search_to", search_to);
		const fromLong = this.ip2long(search_from);
		const toLong = this.ip2long(search_to);
		if ((fromLong >> 8) !== (toLong >> 8)) {
			showMessage("Network addresses must be in the same subnet/24")
			return;
		}
		this.drawSearchBox(`<strong>Searching range:</strong> ${search_from} to ${search_to}`);

		const url = `sonoff/scan_network.php?from=${search_from}&to=${search_to}`;
		let jsonResult = "";
		try {
			jsonResult = await get_url_content(url);
		}
		catch (error) {
			$('search_text').innerHTML = "<strong>Internal error</strong>: could not perform network scanning";
			return;
		}
   	
		const devArray = JSON.parse(jsonResult);
		if (devArray.length == 0) {
			$('search_text').innerHTML = "<strong>Search result: </strong>No devices found";
			return;
		}

		let html = "<strong>Install firmware</strong><br><br>Install firmware into device: \n";
		html += "<select id='ip_address'>\n";
		html += devArray.map(ip => `<option value='${ip}'>${ip}</option>`).join("\n");
		html += "</select>";
		html += `&nbsp;<input id='info_button' type='button' class='small-button' value='Info' onclick='installTasmota.getSonoffInfo(\"iprange\")'>\n`;
		html += "<br><br>";
		html += "DeviceId (required): ";
		html += "<input type='text' id='device_id'>";
		html += "<br><br>";
		html += "<button id='install_tasmota_button' class='basic-button' type='submit' onclick='installTasmota.goInstallTasmota(\"iprange\")'> Install Tasmota </button>";
		$('search_text').innerHTML = html;
	}

	//start mdns search
	async performSearchMDNS() {	
		this.drawSearchBox("Searching mDNS");
		const url = "mdns.php";

		let jsonResult = "";
		try {
			jsonResult = await get_url_content(url);
		}
		catch (error) {
			$('search_text').innerHTML = "<strong>Internal error</strong>: could not perform network scanning";
			return;
		}

		const devArray = JSON.parse(jsonResult);
		if (devArray.length == 0) {
			$('search_text').innerHTML = "<strong>Search result: </strong>No devices found";
			return;
		}

		// show results for mDNS search
		// give info if required, show select to install firmware to

		let html = "Install firmware into device: ";
		html += "<select id='sonoff-device'>";

		devArray.forEach ( (dev) => {
			const host = dev['hostname'];
			const ip = dev['address'];
			// get deviceid
			let deviceid = "";
			let p = -1;
			const data = dev['txt'];
			if ((p=data.indexOf("\"id="))!=-1)
				deviceid = data.substr(p+4, SONOFF_DEVICEID_LEN);
			html += `<option value='${ip};${deviceid}'>${host}</option>`;
		});
		html += "</select>\n";
		html += "&nbsp;<input type='button' class='small-button' value='Info' onclick='installTasmota.getSonoffInfo(\"mdns\")'>";
		html += "<br><br>";
		html += "<button class='basic-button' type='submit' onclick='installTasmota.goInstallTasmota(\"mdns\")'> Install Tasmota </button>";
		$('search_text').innerHTML = html;
	}

	drawSearchBox(title) {
		$('search_section').style.display='block';
		let text = title;
		text += "<br><br><img src='img/spinner.gif'>"
		$('search_text').innerHTML = text;
		this.ensureVisible("search_section");
	}

	ensureVisible(tag) {
		const target = $(tag);
		const y = target.getBoundingClientRect().top + window.pageYOffset - 80;
		window.scrollTo({ top: y, behavior: 'smooth' });
	}

	// retrieve info from sonoff device
	async getSonoffInfo(type) {	
		let ip = "";
		let deviceid = "";

		if (type == 'mdns') {
			// get data from mdns "Device Result"
			// get ip address & deviceid
			const data = this.getMDNSSelectData();
			ip = data[0];
			deviceid = data[1];
		}
		else {	
			// get data from ip range "Device Result"
			let e = $("ip_address");
			ip = e.options[e.selectedIndex].value;
			e = $("device_id");
			deviceid = e.value.trim();
			if (deviceid == "") {
				showMessage("Please specify a DeviceID");
				return ;
			}

			// disable "Devices found" butons
			$("ip_address").disabled = true;
			$("info_button").disabled = true;
			$("device_id").disabled = true;
			$("install_tasmota_button").disabled = true;
		}

		// get info calling get_dev_info.php script
		let result = "<strong>Could not get device info.</strong><br>Verify DeviceId for the right value.";
    	try {
	        const response = await fetch(`sonoff/get_dev_info.php?ip=${ip}&deviceid=${deviceid}`, {
    	        method: 'GET',
        	});

	        if (response.ok) {
	        	const data = await response.text();
				const vdata = JSON.parse(data);
				if (vdata != null) {
					const dv = vdata['data'];
					result = "<table cellpadding=2>";
					for (var key in dv) {
			  			var value = dv[key];
						const keyCap = key.charAt(0).toUpperCase() + key.slice(1);
	  					result += "<tr><td>" + keyCap + ":</td>";
	  					result += "<td>" + value + "</td></tr>";
					}		
					result += "</table>";
				}
        	}
    	} catch (error) {
        	console.log('fetch() failed, error: ' + error);
    	}

		let d=$('device_info_text');
		d.innerHTML = result;
		d=$('device_info_section');
		d.style.display='block';

		if (type != 'mdns') {
			$("ip_address").disabled = false;
			$("info_button").disabled = false;
			$("device_id").disabled = false;
			$("install_tasmota_button").disabled = false;
		}
		this.ensureVisible('device_info_text');
	}

	// get data from mdns select, ip & deviceid
	getMDNSSelectData() {
		var e = $("sonoff-device");
		const text = e.options[e.selectedIndex].value;
		var data = text.split(';');
		return data;
	}

	// call ota_install.php script
	goInstallTasmota(type) {	
		let ip = "";
		let deviceid = "";

		if (type == "iprange") {	
			// get data from ip range "Device Result"
			let e = $("ip_address");
			ip = e.options[e.selectedIndex].value;
			e = $("device_id");
			deviceid = e.value.trim();
			if (deviceid == "") {
				showMessage("Please specify the DeviceID");
				return ;
			}
		}
		else {
			const data = this.getMDNSSelectData();
			ip = data[0];
			deviceid = data[1];
		}
		go_url("ota_install.php?ip=" + ip + "&deviceid=" + deviceid);
	}
};

// called from init_page after configuration is retrieved
function startPage() {
}

function setupNavigation() {
	$('back-image')?.addEventListener("click", () => go_url("index.php"));
	$('img-help')?.addEventListener("click", () => installTasmota.helpInstallTasmota());
	$('search-mdns')?.addEventListener("click", () => installTasmota.performSearchMDNS());
	$('search-iprange')?.addEventListener("click", () => installTasmota.performSearchIPRange());
}

document.addEventListener("DOMContentLoaded", function() {

	installTasmota = new installTasmotaClass();

	const search_from = localStorage.getItem("search_from");
	const search_to = localStorage.getItem("search_to");
	$('search-from').value = search_from ?? server_from;
	$('search-to').value = search_to ?? server_to;
	setupNavigation();
});


