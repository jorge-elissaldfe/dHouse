<?php

function download_file($url, $local_file) 
{ 
    $out = fopen($local_file, 'wb'); 
    if ($out == FALSE)
    { 
		return 0;
		exit; 
    } 

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_FILE, $out); 
    curl_setopt($ch, CURLOPT_HEADER, 0); 
    curl_setopt($ch, CURLOPT_URL, $url); 
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch); 
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch); 
    fclose($out); 

    return $httpcode;
}


function getTasmotaVersion() {	

	$ch = curl_init(TASMOTA_LAST_VERSION);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0)");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

	$response = curl_exec($ch);
	$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$error = curl_error($ch);
	curl_close($ch);
	
	if ($http_status != 200) {
		echo <<<HTML
		Error getting current Tasmota version from the address:<br>
		<a href='<?=TASMOTA_VERSION?>'><?=TASMOTA_VERSION?></a><br>
		<br>Server answer code: $http_status<br>
		Error: $error <br>
		HTML;
		return false;
	}
	$result = json_decode($response, true);
	$version = $result[0]['name'];
	if (!empty($version))
		$version = substr($version, 1);
	return $version;
}


?>
