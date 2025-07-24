// dHouse
// jorge Elissalde 2025

function setRolloverImage (id,normalImg,overImg,style=null) {
	const rolloverImg = document.getElementById(id);
	rolloverImg.style.cursor = "pointer";
	if (style)
		rolloverImg.classList.add(style);
 		rolloverImg.addEventListener("mouseover", function() {
			rolloverImg.src = overImg;
  	});
  	rolloverImg.addEventListener("mouseout", function() {
		rolloverImg.src = normalImg;
	});
}


function go_url(url) {
	window.location.href = url;
}

// reload service configuration
function reload_dHouseService(mqttInstance = null) {
	if (mqttInstance)	
		mqttInstance.sendDHouseCommand(CMD_RELOAD,"",mqttInstance);
	else
		mqttClient.sendDHouseCommand(CMD_RELOAD,"");
}

// get url data using fetch
async function get_url_content(url) {	
	try {
		const response = await fetch(url, 
			{ method: 'GET',
			  cache: 'no-store' 
			}
		);
		if (!response.ok) {
			console.log("get_url_content error: " + response);
			throw new Error(`Status: ${response.status}`);
		}
		const text = await response.text();
		return text;
	} catch (err) {
		console.log ("get_url_content error: " + err);
		throw new Error(err);
	}
}

// store value in php session
function set_php_session(var_to_set) {
	url = "php/set_session.php?" + var_to_set;
	get_url_content(url)
}

async function postUrlContent(url, content) {
	const jsonData = JSON.stringify(content);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: jsonData
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.text();
        return data; 

    } catch (error) {
		
		throw new Error(`HTTP error: ${error.message}`);
        console.error("Post error:", error);

		// return "Error [postURLContent]: " + url + "\n" + error;
    }
}

// store full configuration in dhouse.config file
async function storeConfigurationInServer() {
	url = "php/store_config.php";
	return await postUrlContent(url, config);
}

// store full configuration in dhouse.config file
async function storeNotifyInServer(notify) {
	url = "php/store_notify.php";
	return postUrlContent(url, notify);
}

// store scene configuration in scenes.config file
async function storeScenesInServer(sceneArray) {
	url = "php/store_scenes.php";
	return postUrlContent(url, sceneArray);
}

// store user configuration in user.config file
async function storeUserInServer(userConfig) {
	url = "php/store_user.php";
	return postUrlContent(url, userConfig);
}

function clientIsMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}


// TODO: use create for tags
function messageWithImage(text, img, img_id, img_title) {
	const txt = `\
<div style="display: flex; align-items: center; gap: 8px">${text}\
&nbsp;\
<img id='${img_id}' alt='${img_title}' title='${img_title}' style='cursor: pointer' src="${img}" width="24px">\
</div>`;
	return txt;
}

// load existing scenes
async function loadScenes() {
	try {
    	const response = await fetch(`config/scenes.config?nocache=${Date.now()}`);
    	if (!response.ok) {
			return "";	// throw new Error(`HTTP error! status: ${response.status}`);
	    }
	    const data = await response.text();
	    return data;
  	} catch (error) {
    	return ""; // `Error: ${error.message}`;
  	}
}

// load existing scenes
async function loadUserData() {
	try {
    	const response = await fetch(`config/users.config?nocache=${Date.now()}`);
    	if (!response.ok) {
			return "";	// throw new Error(`HTTP error! status: ${response.status}`);
	    }
	    const data = await response.text();
	    return data;
  	} catch (error) {
    	return ""; // `Error: ${error.message}`;
  	}
}
