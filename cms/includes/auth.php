<?php
session_start();

require_once __DIR__ . '/config.php';

function cms_is_authenticated() {
    return !empty($_SESSION['cms_auth']) && $_SESSION['cms_auth'] === true;
}

function cms_require_auth() {
    if (!cms_is_authenticated()) {
        header('Location: /cms/index.php');
        exit;
    }
}
