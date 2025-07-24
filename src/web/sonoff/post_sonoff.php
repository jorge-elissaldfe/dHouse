<?php

// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


function set_sonoff_switch ($ip, $port, $deviceid, $on_off)
{	
	$url = "http://$ip:$port/zeroconf/switch";
	$switch = ($on_off) ? "on":"off";
	$json_data = "{ 
    	\"deviceid\": \"$deviceid\", 
    	\"data\": {
        	\"switch\": \"$switch\"
    	} 
 	}";

	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array(
	    'Content-Type: application/json',
	    'Content-Length: ' . strlen($json_data)
	));

	$response = curl_exec($ch);
	curl_close($ch);
	$result = json_decode($response, true);
}

function sendSonoffOtaUnlock ($ip, $port, $deviceid) {	
	$url = "http://$ip:$port/zeroconf/ota_unlock";
	$json_data = "{ 
    	\"deviceid\": \"$deviceid\", 
    	\"data\": { }
    	} 
 	}";

	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array(
	    'Content-Type: application/json',
	    'Content-Length: ' . strlen($json_data)
	));

	$response = curl_exec($ch);
	curl_close($ch);
	return json_decode($response, true);
}


function otaInstallFirmware($ip, $port, $deviceid, $firmware_url, $sha256sum) {

	$url = "http://$ip:$port/zeroconf/ota_flash";
	$json_data = "{ 
    	\"deviceid\": \"$deviceid\",
    	\"data\": { 
    		\"downloadUrl\": \"$firmware_url\",
    		\"sha256sum\": \"$sha256sum\"
    		} 
 	}";

 	//echo "json = " . $json_data . "<br>";

	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); 
	curl_setopt($ch, CURLOPT_TIMEOUT, 5);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array(
	    'Content-Type: application/json',
	    'Content-Length: ' . strlen($json_data)
	));

	$response = curl_exec($ch);
	curl_close($ch);
	$result = json_decode($response, true);
	return $result;	
}

function getSonoffInfo ($ip, $port, $deviceid, $send_emptyJson = false) {	
	$url = "http://$ip:$port/zeroconf/info";
	if ($send_emptyJson)
		$json_data = "{ }";
	else
		$json_data = "{ 
    		\"deviceid\": \"$deviceid\", 
    		\"data\": { } 
 		}";

	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); 
	curl_setopt($ch, CURLOPT_TIMEOUT, 5);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array(
	    'Content-Type: application/json',
	    'Content-Length: ' . strlen($json_data)
	));

	$response = curl_exec($ch);
	curl_close($ch);
	$result = json_decode($response, true);
	return $result;
}

// returns array with every ip address to test
function get_ip_range_array($from, $to)
{
    $scan = [];

    if (!filter_var($from, FILTER_VALIDATE_IP) || !filter_var($to, FILTER_VALIDATE_IP))
        return $scan;

    $fromLong = ip2long($from);
    $toLong = ip2long($to);

    if ($fromLong > $toLong)
        return $scan;

    for ($i = $fromLong; $i <= $toLong; $i++)
        $scan[] = long2ip($i);

    return $scan;
}

function discover_sonoff_byip($from, $to) {
	$ip_found = Array();
	$ch = Array();

	$ip_range = get_ip_range_array($from, $to);
	$mh = curl_multi_init();
	$port = 8081;
	$json_data = "{ }";

	foreach($ip_range as $ip)
	{
		$url  = "http://$ip:$port/zeroconf/info";
		$ch[$ip] = curl_init($url);
	    curl_setopt($ch[$ip], CURLOPT_VERBOSE, 0);
		curl_setopt($ch[$ip], CURLOPT_CONNECTTIMEOUT, 8); 
		curl_setopt($ch[$ip], CURLOPT_TIMEOUT, 5);
		curl_setopt($ch[$ip], CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch[$ip], CURLOPT_POST, true);
		curl_setopt($ch[$ip], CURLOPT_POSTFIELDS, $json_data);
	    curl_setopt($ch[$ip], CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch[$ip], CURLOPT_HTTPHEADER, array(
		    'Content-Type: application/json',
		    'Content-Length: ' . strlen($json_data)
		));
    	curl_multi_add_handle($mh, $ch[$ip]);
    }
    do
    {	curl_multi_exec($mh, $running);
    	curl_multi_select($mh);
    }
    while ($running > 0);

  	foreach($ip_range as $ip)
  	{
		$http_status = curl_getinfo($ch[$ip], CURLINFO_HTTP_CODE);
		if ($http_status == 200)
		{
 			$response = curl_multi_getcontent($ch[$ip]);
	 		$result = json_decode($response, true);
 			if ($result!=NULL && $result["error"] == 422)
 				array_push($ip_found,$ip);
 		}
 		curl_multi_remove_handle($mh, $ch[$ip]);
 	}
	curl_multi_close($mh);
	return $ip_found;
}

?>