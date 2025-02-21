<?php 

$templateName = "Lovcare";

$toEmail = "themesland@themewild.com"; //Replace your real receiving email address
$headerEmail = "themesland@themewild.com"; //Replace with your real web master email

$nameErr = $emailErr = $subjectErr = $messageErr = "";  
$name = $email = $subject = $message = "";  

if ($_SERVER["REQUEST_METHOD"] == "POST") { 
    
    //String Validation Name  
    if (empty($_POST["name"])) {  
         $nameErr = "Name is required. ";  
    } else {  
        $name = input_data($_POST["name"]);  
        // check if name only contains letters and whitespace  
        if (!preg_match("/^[a-zA-Z ]*$/",$name)) {  
           $nameErr = "Name only alphabets and white space are allowed. ";  
        }  
    } 
    
    //Email Validation   
    if (empty($_POST["email"])) {  
         $emailErr = "Email is required. ";  
    } else {  
        $email = input_data($_POST["email"]);  
        // check that the e-mail address is well-formed  
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {  
            $emailErr = "Invalid email format. ";  
        }  
    } 
    
    //String Validation Subject  
    if (empty($_POST["subject"])) {  
         $subjectErr = "Subject is required. ";  
    } else {  
        $subject = input_data($_POST["subject"]);  
        // check if subject only contains letters and whitespace  
        if (!preg_match("/^[a-zA-Z ]*$/",$subject)) {  
           $subjectErr = "Subject only alphabets and white space are allowed. ";  
        }  
    } 
    
    //String Validation Message  
    if (empty($_POST["message"])) {  
         $messageErr = "Message is required. ";  
    } else {  
        $message = input_data($_POST["message"]);  
        // check if subject only contains letters, number and whitespace  
        if (!preg_match("/^[a-zA-Z0-9. ]*$/",$message)) {  
           $messageErr = "Message only alphabets, number and white space are allowed. ";  
        }  
    } 
    
    
    if($nameErr == "" && $emailErr == "" && $subjectErr == "" && $messageErr == ""){
        
        $message = "<b>Mail Sender Info:</b> </br>
            <h5><b>Name:</b> ".$name."</h5>
            <h5><b>Email:</b> ".$email."</h5>
            <h5><b>Template Name:</b> ".$templateName."</h5>
            </br><b>Message:</b></br>
            <p>".$message."</p>";
        
    
            $to = $toEmail;
        
            $header = "From:".$headerEmail." \r\n";
            $header .= "MIME-Version: 1.0\r\n";
            $header .= "Content-type: text/html\r\n";
             
            $mail_send = mail ($to,$subject,$message,$header); 
            
            if( $mail_send == true ) {
                $response = [
                    'status' => 'success',
                    'msg' => 'Your message send successfully!.',
                ]; 
            }else {
                $response = [
                    'status' => 'error',
                    'msg' => 'Your message could not be send!.',
                ]; 
            }
        
    }else{

        $response = [
            'status' => 'error',
            'msg' => $nameErr . $emailErr . $subjectErr . $messageErr,
        ]; 
    }

    exit(json_encode($response));

}else{
    echo "Your message could not be send!."; 
}


// data validate
function input_data($data) {  
  $data = trim($data);  
  $data = stripslashes($data);  
  $data = htmlspecialchars($data);  
  return $data;  
} 

?>
