<?php
/**
 * This file is part of the PHPLucidFrame library.
 *
 * This file performs the file upload process and file delete process of AsynFileUploader
 *
 * @package     LC
 * @since       PHPLucidFrame v 1.3.0
 * @copyright   Copyright (c), PHPLucidFrame.
 * @author      Sithu K. <cithukyaw@gmail.com>
 * @link        http://phplucidframe.sithukyaw.com
 * @license     http://www.opensource.org/licenses/mit-license.php MIT License
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.txt
 */

chdir('../');
require_once('bootstrap.php');

### FILE DELETE HANDLER ###
if (count($_POST) && isset($_POST['action']) && $_POST['action'] === 'delete' && count($_FILES) === 0) {
    $post = _post($_POST);
    # unlink the physical files
    if ($post['value']) {
        $dir = base64_decode($post['dir']);
        $file = $dir . $post['value'];
        if (is_file($file) && file_exists($file)) {
            unlink($file);
        }
        # delete the thumbnail images related to the deleted file (if any)
        if (isset($post['dimensions']) && is_array($post['dimensions']) && count($post['dimensions'])) {
            foreach ($post['dimensions'] as $d) {
                $thumbFile = $dir . $d . _DS_ . $post['value'];
                if (is_file($thumbFile) && file_exists($thumbFile)) {
                    unlink($thumbFile);
                }
            }
        }
        # invoke custom delete hook (if any)
        if ($post['onDelete'] && function_exists($post['onDelete'])) {
            call_user_func($post['onDelete'], $post['id']);
        }
    }

    $return = array(
        'name'    => $post['name'],
        'success' => true,
        'error'   => '',
        'id'      => $post['id'],
        'value'   => $post['value']
    );
    echo json_encode($return);
    exit;
}

### FILE UPLOAD HANDLER ###
$get = _get($_GET);

$name         = $get['name'];
$buttonId     = $get['id'];
$label        = $get['label'];
$uploadDir    = base64_decode($get['dir']);
$webDir       = str_replace('\\', '/', str_replace(ROOT, WEB_ROOT, $uploadDir));
$maxSize      = $get['maxSize'];
$fileTypes    = ($get['exts']) ? explode(',', $get['exts']) : '';
$phpCallback  = (isset($get['phpCallback'])) ? $get['phpCallback'] : '';
$buttons      = (isset($get['buttons'])) ? explode(',', $get['buttons']) : array();
$dimensions   = (isset($get['dimensions'])) ? explode(',', $get['dimensions']) : array();

$data = array(
    'success'          => false,
    'id'               => $buttonId,
    'name'             => $name,
    'label'            => $label,
    'disabledButtons'  => $buttons,
    'value'            => '',
    'savedId'          => '',
    'dimensions'       => array(),
    'displayFileName'  => '',
    'displayFileLink'  => '',
    'uniqueId'         => '',
    'extension'        => '',
    'error'            => ''
);

if (count($_FILES)) {
    $post = _post($_POST);

    $validations = array(
        $name => array(
            'caption'  => $label,
            'value'    => $_FILES['file'],
            'rules'    => array('fileMaxSize'),
            'maxSize'  => $maxSize,
            'messages' => array(
                'fileMaxSize' => _t('File size exceeds the maximum allowed upload size %dMB', $maxSize)
            )
        )
    );

    if ($fileTypes) {
        $validations[$name]['rules'][] = 'fileExtension';
        $validations[$name]['extensions'] = $fileTypes;
        $validations[$name]['messages']['fileExtension'] = _t('File must be one of the file types: %s.', _fstr($fileTypes));
    }

    if (Validation::check($validations, 'single') === true) {
        $file = _fileHelper();
        $uniqueId = $file->get('uniqueId');
        $file->set('uploadDir', $uploadDir);
        if (is_array($dimensions) && $dimensions) {
            $file->set('dimensions', $dimensions);
        }

        $fileData = $file->upload($_FILES['file']);

        if ($fileData) {
            $data['success']         = true;
            $data['value']           = $fileData['fileName'];
            $data['displayFileName'] = $fileData['fileName'];
            $data['displayFileLink'] = $webDir . $fileData['fileName'];
            $data['extension']       = $fileData['extension'];
            $data['dimensions']      = $dimensions;
            $data['uniqueId']        = $uniqueId;

            # if onUpload hook is specified, execute the hook
            if ($phpCallback && function_exists($phpCallback)) {
                $data['savedId'] = call_user_func($phpCallback, $fileData, $post);
            }

            # delete the existing files if any
            # before `$_POST[$name]` is replaced with new one in javascript below
            if ($post[$name]) {
                $oldFile = $uploadDir . $post[$name];
                # delete the primary file
                if (is_file($oldFile) && file_exists($oldFile)) {
                    unlink($oldFile);
                }
                # delete the thumbnail images if any
                if (is_array($dimensions) && count($dimensions)) {
                    foreach ($dimensions as $d) {
                        $thumbFile = $uploadDir . $d . _DS_ . $post[$name];
                        if (is_file($thumbFile) && file_exists($thumbFile)) {
                            unlink($thumbFile);
                        }
                    }
                }
            }
        } else {
            $error = $file->getError();
            Validation::addError($name, $error['message']);
        }
    }

    if (count(Validation::$errors)) {
        # if there is any validation error and if there was any uploaded file
        $data['error'] = array(
            'id' => Validation::$errors[0]['htmlID'],
            'plain' => Validation::$errors[0]['msg'],
            'html' => _msg(Validation::$errors, 'error', 'html')
        );
        $data['value'] = $post[$name];
    }

    if (!$data['savedId'] && isset($post[$name.'-id']) && $post[$name.'-id']) {
        # if there was any saved data in db
        $data['savedId'] = $post[$name.'-id'];
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>AsyncFileUploader</title>
    <script language="javascript">
        var parent = window.top;
        var $ = window.top.jQuery;
        var interval = null;
        var data = <?php echo json_encode($data); ?>;

        function startAutoUpload() {
            if (interval) clearTimeout(interval);
            interval = setTimeout( function() {
                $(data.id).hide();
                $('#asynfileuploader-progress-' + data.name).show();
                $('#asynfileuploader-button-' + data.name).hide();
                $('#asynfileuploader-delete-' + data.name).hide();
                $('#asynfileuploader-error-' + data.name).html('');
                $('#asynfileuploader-error-' + data.name).hide();
                if ($('#asynfileuploader-name-' + data.name).size()) {
                    $('#asynfileuploader-name-' + data.name).hide();
                }
                if (data.disabledButtons.length) {
                    for (var i=0; i<data.disabledButtons.length; i++) {
                        var $button = $('#'+data.disabledButtons[i]);
                        if ($button.size()) {
                            $button.attr('disabled', 'disabled');
                        }
                    }
                }
                // post the existing files if any
                $('#asynfileuploader-value-' + data.name).html($('#asynfileuploader-value-' + data.name).html());
                // submit the upload form
                document.fileupload.submit();
            }, 1000 );
        }
    </script>
</head>
<body style="margin:0">
    <form name="fileupload" id="file-upload" method="post" class="no-ajax" enctype="multipart/form-data">
        <input type="file" name="file" id="file" size="30" onChange="startAutoUpload()" style="height:100px" />
        <?php # the existing file uploaded ?>
        <div id="asynfileuploader-value-<?php echo $name; ?>">
            <input type="hidden" name="<?php echo $name; ?>" />
        </div>
        <div id="asynfileuploader-hiddens-<?php echo $name; ?>"></div>
    </form>
</body>
</html>
<script type="text/javascript">
    // Get all hidden values of the parent to here
    document.getElementById('asynfileuploader-hiddens-' + data.name).innerHTML = $('#asynfileuploader-hiddens-' + data.name).html();
    // Progress off
    $('#'+data.id).css('display', 'inline-block');
    $('#asynfileuploader-progress-' + data.name).hide();
    $('#asynfileuploader-button-' + data.name).show();
    if (data.success) {
        if ($('#asynfileuploader-name-' + data.name)) {
            $('#asynfileuploader-name-' + data.name).html('<a href="' + data.displayFileLink + '" target="_blank">' + data.displayFileName + '</a>');
            $('#asynfileuploader-name-' + data.name).css('display', 'inline-block');
        }
        // POSTed values
        $('#asynfileuploader-fileName-' + data.name).val(data.displayFileName);
        $('#asynfileuploader-uniqueId-' + data.name).val(data.uniqueId);
        // The file uploaded or The array of files uploaded
        var inputs = '';
        inputs += '<input type="hidden" name="' + data.name + '" value="' + data.value + '" />';
        inputs += '<input type="hidden" name="' + data.name + '-id" value="' + data.savedId + '" />';
        for (var i=0; i<data.dimensions.length; i++) {
            var dimension = data.dimensions[i];
            inputs += '<input type="hidden" name="' + data.name + '-dimensions[]" value="' + dimension + '" />';
        }

        $('#asynfileuploader-value-' + data.name).html(inputs);
        // run hook
        window.parent.LC.AsynFileUploader.onUpload({
            name:       data.name,
            id:         data.id,
            value:      data.value,
            savedId:    data.savedId,
            fileName:   data.displayFileName,
            url:        data.displayFileLink,
            extension:  data.extension,
            caption:    data.label
        });
    } else {
        if (data.error) {
            // show errors
            parent.LC.AsynFileUploader.hook.onError(data.name, data.error);
        }
        if (data.value) {
            // if there is any file uploaded previously
            $('#asynfileuploader-delete-' + data.name).css('display', 'inline-block');
            if ($('#asynfileuploader-name-' + data.name).size()) {
                $('#asynfileuploader-name-' + data.name).css('display', 'inline-block');
            }
        }
    }
    // re-enable buttons
    if (data.disabledButtons.length) {
        for (var i=0; i<data.disabledButtons.length; i++) {
            var $button = $('#'+data.disabledButtons[i]);
            if ($button.size()) {
                $button.attr('disabled', 'disabled');
            }
        }
    }
</script>
