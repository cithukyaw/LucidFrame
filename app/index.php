<?php
/**
 * PHPLucidFrame : Simple, Lightweight & yet Powerfull PHP Application Framework
 * The request collector
 *
 * @package     PHPLucidFrame\App
 * @since       PHPLucidFrame v 1.0.0
 * @copyright   Copyright (c), PHPLucidFrame.
 * @author      Sithu K. <cithukyaw@gmail.com>
 * @link        http://phplucidframe.com
 * @license     http://www.opensource.org/licenses/mit-license.php MIT License
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE
 */

require_once '../lib/bootstrap.php';

ob_start('_flush');

require_once router();

if (_cfg('layoutMode') && _isAjax() === false) {
    $query = _ds(APP_ROOT, _r(), 'query.php');

    if (is_file($query) && file_exists($query)) {
        require_once $query;
    }

    $layout = _i(_ds('inc', 'tpl', _cfg('layoutName').'.php'));
    if (is_file($layout) && file_exists($layout)) {
        require_once $layout;
    } else {
        die('Layout file is missing: ' . $layout);
    }
}

ob_end_flush();
