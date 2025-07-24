// dHouse
// Tasmota devices manager
// jorge elissalde 2025

/*
 * create dom element
 * ie: const btn = createElem("button", { text: "Click me", class: "btn" });
 * const optionImg = createElem("img", {
 *			src: `img/${icon}`,
 *			title: title,
 *			class: "device-icon",
 *			style: {
 * 				cursor: "pointer",
 *				marginTop: "2px"
 *			}
 *		});
 */
function createElem(tag, options = {}) {
	const el = document.createElement(tag);
	for (let [key, value] of Object.entries(options)) {
		if (key === 'id')
			el.id = value;
		else if (key === 'text') 
			el.textContent = value;
		else if (key === 'class') 
			el.className = value;
		else if (key == 'classlist')
			el.classList.add (value);
		else if (key === 'html') 
			el.innerHTML = value;
		else if (key === 'style' && typeof value === 'object') 
			Object.assign(el.style, value);
		else el.setAttribute(key, value);
	}
	return el;
}
