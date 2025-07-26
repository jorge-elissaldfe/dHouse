<?php

// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

if (!isset($_GET['from']) || !isset($_GET['to']))
	die("Missing parameters");

echo json_encode(discover_tasmota_byip($_GET['from'], $_GET['to']));


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

function discover_tasmota_byip($from, $to) {
	$ip_found = Array();
	$ch = Array();

	$ip_range = get_ip_range_array($from, $to);
	$mh = curl_multi_init();
	$port = 80;
	$json_data = "{ }";

	foreach($ip_range as $ip)
	{
		$url  = "http://$ip:$port/cm?cmnd=status%200";
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
			$result = "";
			try {
	 			$result = json_decode($response, true);
			}
			catch (Exception $e) {
			}
 			if ($result!=NULL && isset($result["Status"])) {
				$device = $result['Status']['Topic'] ?? '';
				$deviceName = $result['Status']['DeviceName'] ?? '';
				$friendlyName = $result['Status']['FriendlyName'][0] ?? '';
				$mqttHost = $result['StatusMQT']['MqttHost'] ?? '';
				array_push($ip_found, [ 'ip' => $ip, 
										'device' => $device, 
										'deviceName' => $deviceName, 
										'friendlyName' => $friendlyName, 
										'mqttHost' => $mqttHost]);
			}
 		}
 		curl_multi_remove_handle($mh, $ch[$ip]);
 	}
	curl_multi_close($mh);
	return $ip_found;
}


?>