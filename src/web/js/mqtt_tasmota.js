// dHouse
// mqtt Tasmota connection manager
// Jorge Elissalde 2025

class mqttTasmota {

	// callback functions events
	static STAT_MESSAGE = "stat_message";
	static TELE_MESSAGE = "tele_message";
	static CONNECTION_SUCCESS = "connection_success";
	static CONNECTION_ERROR = "connection_error";
	static CONNECTION_OFFLINE = "connection_offline"
	static POWER_CHANGE = "power_change";
	static DEVICE_OFFLINE = "device_offline";
	static DEVICE_ONLINE = "device_online";
	static MULTI_POWER_SWITCHES = "multi_power_switches";	// send number of multiple power switches
	static MULTI_POWER_CHANGE = "multi_power_change";		// send multiple power change value for a device 
	static POWER_CHANGE_COMMAND = 'command';				// possible status sent by POWER_CHANGE:
	static POWER_CHANGE_STATUS = 'status';

	callbacks = new Map();
	disableCallbackCall = false;
	debug = false;
	ws = null;
	connected = false;

	constructor (debug) {
		this.debug = debug;
	}

	// connect to mqqt proxy 
	mqttConnect(debug=false) {
		// security is handled by Apache redirection for websockets
		let proxyAddress;
		
		if (window.location.protocol === 'https:') 
			proxyAddress = "wss://";
		else
			proxyAddress = "ws://";
 		proxyAddress += window.location.hostname + "/ws/";

		this.debug = debug;
		this.ws = new WebSocket(proxyAddress);
  		this.ws.onopen = () => {
	    	console.log("WebSocket conectado: " + proxyAddress);
			this.connected = true;
			this.triggerCallback(mqttTasmota.CONNECTION_SUCCESS);
  	 	};
  
	 	this.ws.onmessage = (event) => {
    		const msg = JSON.parse(event.data);
			if (this.debug)
    			console.log(`MQTT ${msg.topic}: ${msg.message}`);
			this.parseMessage(msg.topic, msg.message);
  		};

  		this.ws.onerror = (err) => {
    		console.error("WebSocket error:", err);
			this.triggerCallback(mqttTasmota.CONNECTION_ERROR);
  		};

  		this.ws.onclose = () => {
    		console.warn("WebSocket desconectado");
  		};
	}

	// call 'event' callback function
	triggerCallback(event, topic, message, dev, type) {
		if (!this.connected) {
			return;
		}
		if (this.disableCallbackCall)
			return;

    	const callbackFunc = this.searchCallback(event);
    	if (callbackFunc) {
	        const args = topic ? [topic, message, dev, type] : [];
        	callbackFunc(...args);
    	}
	}

	// return 'event' callback or null
	searchCallback(event) {
		return this.callbacks.get(event) || null;
	}

	// add callback function
	callbackSubscribe(event, func) {
		this.callbacks.set(event, func);
	}

	disableCallbacks() {
		this.disableCallbackCall = true;
	}

	enableCallbacks() {
		this.disableCallbackCall = false;
	}

	publish(cmd,payload) {
		if (!this.connected)  {
			console.log ("-- mqtt_tasmota: proxy not connected while sending command");
			return;
		}
		this.ws.send(JSON.stringify({
  			topic: cmd,
  			message: payload
		}));
	}

	// get status from device
	// 0 = all configurations
	getStatus(dev,type) {
		this.publish(`cmnd/${dev}/Status`, type);
	}

	// set power for device
	setPower(dev,power,powerSwitch=-1) {
		if (powerSwitch == -1) {
			this.publish(`cmnd/${dev}/Power`,power);
		}
		else {
			this.publish(`cmnd/${dev}/Power${powerSwitch}`,power);
		}
	}

	// set timer for schedule data
	setScheduleTimer(dev,index,timerData) {
		const timerIndex = `Timer${index}`;
		this.publish(`cmnd/${dev}/${timerIndex}`, timerData);
	}

	getPulseTime(dev) {
		this.publish(`cmnd/${dev}/PulseTime`, '');
	}

	// get all timers from device
	getTimers(dev) {
		this.publish(`cmnd/${dev}/Timers`, '');
	}

	setTimersOnOff(dev, onoff) {
		this.publish(`cmnd/${dev}/Timers`, onoff ? '1':'0');
	}

	// get timed_power (enable/disable after a period of time)
	getTimedPower(dev) {	
		this.publish(`cmnd/${dev}/TimedPower`, '');
	}

	/** set timed power (enable/disable after a period of time)
		from Tasmota Commands:
		TimedPower<x> 	Executes Power<x> [ON\|1\|OFF\|0\|TOGGLE\|2\|BLINK\|3] 
						and after <value> milliseconds executes inverted action 
						Power<x> [OFF\|ON\|TOGGLE\|BLINK_OFF]
		<value> should stick to 50ms granularity
		TimedPower to show remaining timers
		TimedPower<x> to clear timer for corresponding <x> relay
	**/
	setTimedPower(dev,ms,action,switchIndex=null) {
		//ms = 7000;
		const payload = `${ms},${action}`;
		if (!switchIndex) {
			// single power switch device 
    		this.publish(`cmnd/${dev}/TimedPower`, payload);
		}
		else {
			// multiple power switch device
			this.publish(`cmnd/${dev}/TimedPower${switchIndex}`, payload);
		}
	}

	resetTimedPower(dev, powerSwitch=0) {
		if (powerSwitch == 0) {
			// single power switch device
			powerSwitch = 1;
		}
		this.publish(`cmnd/${dev}/TimedPower${powerSwitch}`,'');
	}

	// get state will return the state of every switch
	// POWER1 = ON / POWER = OFF, ...etc
	getState(dev) {
		this.publish(`cmnd/${dev}/State`,'');
	}

	// parse message received from mqtt
	// will call callback defined function
	parseMessage(topic, message) {

		if (topic == undefined)
			return;

		const data = topic.split("/");
		const msg = data[0];		
		const thisDevice = data[1]
		const type = data[2];

		if (msg == 'dhouse') {
			this.getDHouseData(thisDevice, topic, message);
			return;
		}

		if (msg == 'stat')
		{	// power message is detected depite the whole stat message is sent to the callback
			// this.triggerCallback(DEVICE_ONLINE,thisDevice);
			this.detectPowerChange(topic,message,thisDevice,type);
			this.triggerCallback(mqttTasmota.STAT_MESSAGE,topic,message,thisDevice,type);
		}
		else {
			if (msg == 'tele') {
				if (topic.endsWith("LWT") && message == "Offline")
					this.triggerCallback(mqttTasmota.DEVICE_OFFLINE,thisDevice);
				else 
					if (topic.endsWith("LWT") && message == "Online") {
						this.triggerCallback(mqttTasmota.DEVICE_ONLINE,thisDevice);
					}
					else
						this.triggerCallback(mqttTasmota.TELE_MESSAGE,topic,message,thisDevice,type);
			}
		}
	}

	// message from dHouse proxy
	getDHouseData(thisDevice, topic, message) {
		if (topic.endsWith("STATUS")) {
			// this is sent from the list that dHouse proxy keeps with devices status (online/offline)
			// this is the answer for the command:
			//		mqttClient.publish("cmd/dHouse/proxy","DevicesStatus");
			if (message == "Online")
				this.triggerCallback(mqttTasmota.DEVICE_ONLINE,thisDevice);
			else
				this.triggerCallback(mqttTasmota.DEVICE_OFFLINE,thisDevice);
		}
	}

	// send command to dHouse service
	sendDHouseCommand(cmd, payload, mqttInstance = null) {
		this.publish(`dhouse/cmd/${cmd}`,payload);
	}

	fixQuote(str) {
		return str.replace(
    		/("Upgrade"\s*:\s*".*?)"(http.*?\.bin\.gz)""/,
    		'$1\'$2\'"'
  		);
	}

	// detect power message and send it to the callback
	detectPowerChange(topic, message, dev, type) {

		if (this.disableCallbackCall)
			return;

		// TODO: get # of real power button
		const powerButton = 1;

		let callback_func=this.searchCallback(mqttTasmota.POWER_CHANGE);

		try {
			switch (type) {	
				case 'STATUS': {
					const obj = JSON.parse(message);
					const multiPowerFunc = this.searchCallback(mqttTasmota.MULTI_POWER_SWITCHES);
					if (multiPowerFunc) {
						// notify multiple power switches for this device (number of digits)
						// obj.Status.Power = 01 (2 switches) / 0 (1 switch) / etc...
						multiPowerFunc(dev,obj.Status.Power.length);
					}
					// single power control
					//callback_func(dev,obj.Status.Power == 1,powerButton);
      				break;
				}

				case 'RESULT': {
					/* fix for this kind of messages:
					 * {"Upgrade":"Version 9.5.0 from "http://ota.tasmota.com/tasmota/release/tasmota.bin.gz""}
					 */
					const result = this.fixQuote(message);
					try{
					const obj = JSON.parse(result, (key, value) => {
						if (key == 'POWER') {
							if (callback_func) 
								callback_func(dev, value == 'ON',powerButton);
						}
						else {
							// detect multi power status and send it as a power change
							const isPower = /^POWER\d+$/.test(key);
							if (isPower) {
								const multiPowerFunc = this.searchCallback(mqttTasmota.MULTI_POWER_CHANGE);
								if (multiPowerFunc) {
									const match = key.match(/^POWER(\d*)$/);
									const powerSwitch = match ? (match[1] === "" ? 0 : parseInt(match[1], 10)) : null;
									multiPowerFunc(dev, value, powerSwitch, mqttTasmota.POWER_CHANGE_STATUS);
								}
							}
						}
					});
					}
					catch (error) {
						console.log ("error for: " + message + " fixed as: " + result);
					}
					break
				}

				case 'POWER': 
					break;

				default: {
					/** check multiple power controls already requested by 'power0' command
					 ** POWER1, POWER2, ...etc
					 **/
				}
			}
		}			
		catch (error) {
			console.error("json parse error ", error);
			console.log(`topic: ${topic}, message: ${message}, dev: ${dev}, type: ${type}`);
		}
	}
};


