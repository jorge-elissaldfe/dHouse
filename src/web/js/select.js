// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025
// build select data functions

// create a generic select between min to max
function createSelect (id, width, min, max, unit, defaultValue) {
	const select = createElem("select", { id: id, style: { width: `${width}px` } } );
    const fragment = document.createDocumentFragment();
    for (let i = min; i <= max; i++) {
       	const option = createElem("option");
       	option.value = i;
		option.selected =  (i == defaultValue);
       	option.textContent = `${i} ${unit}`;
       	fragment.appendChild(option);
   	}
   	select.appendChild(fragment);
    return select;
}

// create a select for multiple switches
function createSelectPowerSwitch (id, width, selectPowerSwitch) {
	const select = createElem("select", { id: id, style: { width: `${width}px`} });
	const switches = config.dHouse.devices[device];
	Object.entries(switches)
    	.filter(([key]) => key.startsWith("switch_"))
    	.forEach(([key, value]) => {
	        const option = createElem('option');
        	option.value = key;
        	option.textContent = value;
			const powerSwitch = key.split("_")[1];
			if (selectPowerSwitch == powerSwitch)
				option.selected = true;
        	select.appendChild(option);
    	});
    return select;
}

// turn on/turn off select
function createOnOffSelect(id, defaultValue, shortMsg=false, showToggle=false) {
	const select = createElem("select", { id: id });
	select.style.width=shortMsg ? "40px":"80px";

	let option = createElem("option");
	option.value = 'ON'
	option.selected = (defaultValue == option.value);
	option.textContent = shortMsg ? "ON":"Turn ON";				// set on, and turn off after selected time
	select.appendChild(option);

	option = createElem("option");
	option.value = 'OFF'
	option.selected = (defaultValue == option.value);
	option.textContent = shortMsg ? "OFF":"Turn OFF";			// turn on after selected time
	select.appendChild(option);

	if (showToggle) {
		option = createElem("option");
		option.value = 'TOGGLE'
		option.selected = (defaultValue == option.value);
		option.textContent = "TOGGLE";			
		select.appendChild(option);
	}	
	return select;
}
