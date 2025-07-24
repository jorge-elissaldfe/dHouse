// dHouse
// Tasmota devices manager
// get available tasmota release
// Jorge Elissalde 2025

const tasmota_release_info = [ 
	'tasmota.bin = The Tasmota version with most drivers for 1M+ flash. RECOMMENDED RELEASE BINARY.',
	'tasmota-4M.bin = The Tasmota version with most drivers and filesystem for 4M+ flash.',
	'tasmota-display.bin = The Display version without Energy Monitoring but adds display support for 1M+ flash.',
	'tasmota-ir.bin = The InfraRed Receiver and transmitter version allowing all available protocols provided by library.',
	'tasmota-knx.bin = The Knx version without some features but adds KNX support for 1M+ flash.',
	'tasmota-lite.bin = The Lite version without most drivers and sensors for 1M+ flash.',
	'tasmota-sensors.bin = The Sensors version adds more useful sensors for 1M+ flash.',
	'tasmota-zbbridge.bin = The dedicated Sonoff Zigbee Bridge version for 2M+ flash.',
	'tasmota-zigbee.bin = The dedicated cc25xx Zigbee Bridge version for 4M+ flash.'
];


// get last available tasmota firmware
async function getLastTasmotaFirmware(tasmotaUrl, callbackFunc) {	
	console.log ("get last tasmota firmware");
	try {
		const response = await fetch(tasmotaUrl, { method: 'GET' });
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const json = await response.json();

		if (!Array.isArray(json) || json.length === 0 || !json[0]?.name) {
			throw new Error("Could not get last Tasmota firmware available");
		}

		let lastTasmotaFirmware = json[0].name;
		if (lastTasmotaFirmware.startsWith('v')) {
			lastTasmotaFirmware = lastTasmotaFirmware.slice(1);
		}
		callbackFunc(lastTasmotaFirmware);
	} catch (e) {	
		console.error("Error fetching last Tasmota firmware:", e);
	}
}

