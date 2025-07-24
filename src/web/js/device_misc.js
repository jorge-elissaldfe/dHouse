// dHouse
// Tasmota devices manager
// jorge elissalde 2025


/** obtiene los componentes de un multi switch device: tasmota_xxx:switch_n
 ** retorna: tasmota_xxx n
 ** si no es un multi device: tasmota_xxx
 ** retorna: tasmota_xxx 0 
 **/
function splitMultiDevice(dev) {
	const match = dev.match(/^([^:]+)(:switch_(\d+))?$/);
  
	if (match) {
    	const device = match[1];
    	const switchNumber = match[3] !== undefined ? parseInt(match[3], 10) : 0;
		const switchStr = `switch_${switchNumber}`;
    	return { device, switchNumber, switchStr };
  	} else {
		return { device: null, switchNumber: null, switchStr: null}
	}
}
