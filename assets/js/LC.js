/**
 * This file is part of the PHPLucidFrame library.
 * Core Javascript utility
 *
 * @package     PHPLucidFrame\Core
 * @since       PHPLucidFrame v 1.0.0
 * @copyright   Copyright (c), PHPLucidFrame.
 * @author      Sithu K. <cithukyaw@gmail.com>
 * @link        http://phplucidframe.com
 * @license     http://www.opensource.org/licenses/mit-license.php MIT License
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.txt
 */
(function(win, $) {
    var LC = win.LC;
    var Form = {
        formData: {},
        /**
         * @internal
         * LC.Form.init()
         * Initialize the forms for Ajax
         */
        init: function() {
            Form.placeholderIE();
            var $forms = $('form');
            $.each( $forms, function() {
                var $form = $(this);
                if (typeof(CKEDITOR) !== 'undefined') {
                    for (var instance in CKEDITOR.instances) {
                        if (CKEDITOR.instances.hasOwnProperty(instance)) {
                            CKEDITOR.instances[instance].updateElement();
                        }
                    }
                }
                if ($form.hasClass('no-ajax')) {
                    return; // normal form submission
                }
                // Add a hidden input and a reset button
                $form.append('<input type="hidden" name="submitButton" class="submitButton" />');
                $form.append('<input type="reset" class="reset" style="display:none;width:0;height:0" />');
                // submit buttons: class="submit"
                var btns = $form.find('.submit');
                if (btns.length) {
                    // if the form has no type=submit button and the form has a class "default-submit", make form submit when pressing "Enter" in any textbox
                    if ( $form.find('[type=submit]').length === 0 && $form.hasClass('default-submit') ) {
                        $form.find('input[type=text],input[type=password]').keyup(function(e) {
                            if (e.keyCode === 13) {
                                $form.submit();
                            }
                        });
                    }
                    $.each( btns, function() { // buttons that have the class "submit"
                        // The submit button click
                        $(this).bind('click', function() {
                            $form.find('input.submitButton').val($(this).attr('name'));
                            if ( $(this).attr('type') === 'button' ) {
                                $form.submit();
                            }
                        });
                    });
                }
                // submit buttons: type="submit"
                $.each( $form.find('[type=submit]'), function() {
                    $(this).bind('click', function() {
                        $form.find('input.submitButton').val($(this).attr('name'));
                    });
                } );

                // form submit handler init
                $form.submit( function(e) {
                    Form.submitForm($form.attr('id'), e);
                    return false;
                } );

                if ( !$form.hasClass('no-focus') ) { // sometimes a page is long and the form is at the bottom of the page, no need to focus it.
                    // focus on the first input
                    if ($form.find('input[type=text]').length) {
                        $form.find('input[type=text]').filter(':first').focus();
                    } else if ($form.find('textarea').length) {
                        $form.find('textarea').filter(':first').focus();
                    }
                }
            });
            // jquery ui button theme
            if (typeof $('.jqbutton').button !== 'undefined') {
                $('.jqbutton').button();
            }
            // datepicker initialize
            $('.datepicker').each(function() {
                var format = $(this).data('format');
                if (!format) {
                    format = $(this).data('date-format') || 'dd-mm-yy';
                }
                $(this).datepicker({
                    changeMonth: true,
                    changeYear: true,
                    dateFormat: format
                });
            });
        },
        /**
         * @internal
         * LC.Form.placeholderIE()
         * IE placeholder attribute fix
         */
        placeholderIE : function() {
            if ($('html').hasClass('ie7') || $('html').hasClass('ie8')) {
                var $inputs = $('[placeholder]');
                $inputs.focus(function() {
                    var input = $(this);
                    if (input.val() === input.attr('placeholder')) {
                        input.val('');
                        input.removeClass('placeholder');
                    }
                });

                $inputs.blur(function() {
                    var input = $(this);
                    if (input.val() === '' || input.val() === input.attr('placeholder')) {
                        input.addClass('placeholder');
                        input.val(input.attr('placeholder'));
                    }
                }).blur();

                $inputs.parents('form').submit(function() {
                    $(this).find('[placeholder]').each(function() {
                        var input = $(this);
                        if (input.val() === input.attr('placeholder')) {
                            input.val('');
                        }
                    });
                }).addClass('no-focus'); // no focus on the first element of the form.
            }
        },
        /**
         * @internal
         * LC.Form.submitform()
         * Ajax form submission
         */
        submitForm : function(formId) {
            var $form = $('#'+formId);
            $form.find('.invalid').removeClass('invalid');

            var $action = $form.attr('action');
            if (!$action) {
                $form.attr('action', Page.url(LC.cleanRoute) + 'action.php');
            }

            if ( $form.find('input[type=file]').length ) {
                Page.progress.start();
                $form.submit();
                return true;
            }

            var url = $form.attr('action'); // which URL to be posted; captured from form action attribute
            var values = $form.serialize(); // encode a set of form elements as a string for submission

            $.ajax({
                type: 'POST',
                url: url,
                dataType: 'json',
                data: values,
                success: Form.submitHandler
            });
            Page.progress.start(formId);
        },
        /**
         * @internal
         * LC.Form.submitHandler()
         * Ajax form submit handling
         */
        submitHandler : function(response) {
            if (response) {
                var $form  = $('#'+response.formId);
                var $message = $form.find('.message').filter(':first');
                if (response.error && response.error.length > 0) {
                    var errHtml = '<div class="message-error alert alert-danger"><ul>';
                    $.each( response.error, function(i, err) {
                        if (err.htmlID) {
                            if (err.htmlID.indexOf('[]') !== -1) {
                                err.htmlID = err.htmlID.replace(/\[\]/, '');
                                $form.find('#'+err.htmlID).find('input,select,textarea').addClass('invalid');
                            } else {
                                if ($('#'+err.htmlID).length) {
                                    $form.find('#' + err.htmlID).addClass('invalid');
                                } else {
                                    $form.find('input[name='+err.htmlID+'],textarea[name='+err.htmlID+'],select[name='+err.htmlID+']').addClass('invalid');
                                }
                            }
                        }
                        errHtml += '<li>' + err.msg + '</li>';
                    } );
                    errHtml += '</ul></div>';
                    $message.html(errHtml).show();

                    if ( $message.find('ul').html() === '' ) {
                        $('#form_error ul').remove();
                    }

                    window.location = '#' + response.formId;
                } else {
                    if (response.success) {
                        if (response.redirect) {
                            window.location = response.redirect;
                        } else {
                            LC.Form.clear(response.formId);
                            if (response.msg) {
                                $message.html('<div class="message-success alert alert-danger">' +
                                    '<ul><li>'+response.msg+'</li></ul>' +
                                    '</div>')
                                    .show();
                            }
                            window.location = '#' + response.formId;
                        }
                    }
                }
                if (response.callback) {
                    eval(response.callback); // jshint ignore:line
                }
                Page.progress.stop(response.formId);
            } else {
                Page.progress.stop();
            }
        },
        /**
         * LC.Form.clear()
         * Clear the form values and form messages
         */
        clear : function( formId ) {
            var $form = $('#'+formId);

            $form.find('.message').filter(':first').html('').hide();
            $form.find('.invalid').removeClass('invalid');

            $form.find('input, select, textarea').each(function (i, elem) {
                var $input = $(elem);
                if (($input.attr('name') && !$input.attr('name').includes('lc_formToken')) &&
                    $input.attr('type') !== 'checkbox' &&
                    $input.attr('type') !== 'radio') {
                    $input.val();
                    if ($input.data('default')) {
                        $input.val($input.data('default'));
                    }
                }
            });
        },
        /**
         * @deprecated Use getFormData() instead
         * LC.Form.data()
         * Get the embedded JSON form data
         */
        data : function( id ) {
            var $data = $( '#row-'+id ).find('.row-data');
            if ($data.length) {
                var $row = {};
                if ($('html').hasClass('ie7')) {
                    eval('$row = ' + $data.text() ); // jshint ignore:line
                } else {
                    $row = JSON.parse($data.text());
                }
                return $row;
            }
            return false;
        },
        /**
         * LC.Form.getFormData()
         * Get the embedded JSON form data
         */
        getFormData : function(formId, id) {
            if (typeof LC.Form.formData[formId][id] !== 'undefined') {
                return LC.Form.formData[formId][id];
            }

            return false;
        },
        /**
         * LC.Form.slug()
         * Generate slug value from the given string
         */
        slug : function( str ) {
            str = str.toLowerCase();
            str = str.replace(/\s|`|~|!|@|#|\$|%|\^|&|\*|\(|\)|{|}|\[|\]|=|-|:|;|'|"|<|>|\|\||\?|,/g, '-'); // replace special chars
            str = str.replace(/-{2,}/g, '-'); // replace 1 dashes for two or more dashes
            str = str.replace(/(^-)|(-$)/g, ''); // trim leading and trailing dashes

            return str;
        }
    };
    // Add under the namespace "LC"
    LC.Form = Form;

    var Page = {
        /* Path to the site root including the language code (if multi-langual site) */
        root : (LC.lang) ? LC.root + LC.lang + '/' : LC.root,
        /* Throbber when doing AJAX requests */
        progress : {
            start : function(id) {
                var $loading = $('#page-loading');
                var $loadingMsg = $loading.find('#processing');
                if (id) {
                    if (typeof Page.throbber[id] !== 'undefined' && typeof Page.throbber[id].start === 'function') {
                        Page.throbber[id].start();
                    } else {
                        $loading.show();
                        $loadingMsg.css('top', ($loading.height() - $loadingMsg.height()) / 2);
                        $loadingMsg.css('left', ($loading.width() - $loadingMsg.width()) / 2);
                    }
                } else {
                    $loading.show();
                    $loadingMsg.css('top', ($loading.height() - $loadingMsg.height()) / 2);
                    $loadingMsg.css('left', ($loading.width() - $loadingMsg.width()) / 2);
                }
            },
            stop : function(id) {
                if (id) {
                    if (typeof Page.throbber[id] !== 'undefined' && typeof Page.throbber[id].stop === 'function') {
                        Page.throbber[id].stop();
                    } else {
                        $('#page-loading').hide();
                    }
                } else {
                    $('#page-loading').hide();
                }
            }
        },
        throbber : {
            /**
             * Register a custom throbber
             * @param string id    HTML container ID for the request
             * @param object callback The callback must be a functional object like { start: function() {}, stop: function() {} }
            */
            register : function(id, callback) {
                Page.throbber[id] = callback;
            }
        },
        queryStr : {},
        /*
         * @internal
         * LC.Page.initialize()
         * Initialize the page
         */
        initialize : function() {
            // overlay and progress message create
            var $overlay = $('body').prepend('<div id="page-loading" />').children(':first').hide();
            var $loading = $overlay.append('<div />').children(':last').attr('id', 'processing');
            var $div = $loading.append('<div />').children(':last');
            $div.append('<span />').children(':last').html('Processing, please wait...').attr('id', 'line1');

            $overlay.width($(window).width());
            $overlay.height($(window).height());

            Page.scroller();
            Form.init();
            Page.showGlobalMessage();
        },
        /*
         * Display side-wide global message (if any)
         */
        showGlobalMessage : function() {
            var html = '';
            if (LC.sitewideWarnings) {
                if (typeof(LC.sitewideWarnings) === 'string') {
                    LC.sitewideWarnings = [LC.sitewideWarnings];
                }

                $.each(LC.sitewideWarnings, function(i, msg) {
                    html = '<div class="message" title="Click to dismiss" style="display:none">';
                    html += '<div class="message-sitewide message-warning">';
                    html += '<ul>';
                    html += '<li>' + msg + '</li>';
                    html += '</ul>';
                    html += '</div>';
                    html += '</div>';
                    $('body').prepend(html);
                });

                $('.message-sitewide').parent('.message').slideDown().click(function() {
                    $(this).slideUp();
                });
            }
        },
        /*
         * Get the absolute URL path
         * @param string path The route path
         */
        url : function(path) {
            path = path.replace(/^\/|\/$/g, ''); // trim the trailing slash
            var $seg = path.split('/');
            if (typeof LC.sites === 'object' && LC.namespace in LC.sites) { // array_key_exists
                $seg[0] = LC.namespace;
                path = $seg.join('/');
            }
            return Page.root + path + '/';
        },
        /*
         * Language switcher callback
         * @param string lng The language code to be switched
         */
        languageSwitcher : function(lng) {
            var $lang = LC.lang + '/';
            var $path = window.location.pathname;
            var $url  = '';
            if ($path.indexOf('/') === 0) { // remove leading slash
                $path = $path.substr(1);
            }

            // remove baseURL from the URI
            var baseURL = LC.baseURL;
            if (LC.baseURL === '/') {
                baseURL = '';
            }
            var regexp = new RegExp(baseURL);
            $path = $path.replace(regexp, '');

            // replace language code in URI
            if ($path.indexOf($lang) === 0) {
                regexp = new RegExp($lang);
                $path = $path.replace(regexp, lng + '/');
            } else {
                $path = lng + '/' + $path;
            }

            // new URL
            $url = window.location.protocol + '//' + window.location.host + '/' + baseURL + $path;
            window.location = $url;
        },
        /**
         * @internal
         * Performs a smooth page scroll to an anchor on the same page.
         */
        scroller : function() {
            $('a[href*="#"]:not([href="#"])').click(function() {
                if (window.location.pathname.replace(/^\//,'') === this.pathname.replace(/^\//,'') && window.location.hostname === this.hostname) {
                    var target = $(this.hash);
                    target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
                    if (target.length) {
                        $('html,body').animate({
                          scrollTop: target.offset().top
                        }, 1000);
                        return false;
                    }
                }
            });
        },
        /**
         * Set the updated query string
         * @param string id The ID related to the Ajax request
         * @param string key The query string key
         * @param mixed value The value for the query string
         */
        setQueryStr : function(id, key, value) {
            if (typeof Page.queryStr['_'+id] !== 'undefined' && key && value) {
                Page.queryStr['_'+id][key] = value;
            }
            return null;
        },
        /**
         * Get the updated query string
         * @param string id The ID related to the Ajax request
         * @param string key The query string key
         * @return mixed
         */
        getQueryStr : function(id, key) {
            if (typeof Page.queryStr['_'+id] !== 'undefined' && key) {
                return Page.queryStr['_'+id];
            }
            return null;
        },
        /**
         * Ajax request helper
         * @param string id    HTML container ID or GET/POST for no HTML response
         * @param string url URL to request
         * @param object param Query string to URL (optional)
         * @param function callback Callback function to execute (optional)
        */
        request : function(id, url, params, callback) {
            Page.progress.start(id);

            params = params || {};

            var $type = 'GET';
            var $html = true;
            if (id.toUpperCase() === 'POST' || id.toUpperCase() === 'GET') {
                $type = id;
                $html = false;
            } else {
                Page.queryStr['_'+id] = params;
            }

            $.ajax({
                type: $type,
                url: url,
                data: params,
                cache: false,
                success: function(response) {
                    if (typeof callback !== 'undefined') {
                        callback(response);
                    } else {
                        if ($html === true) { // the response may contain both HTML and script
                            var $rsp = response.split('[script]');
                            var html = $rsp[0];
                            if (html) {
                                $('#'+id).html(html);
                            }
                            if ( $rsp.length > 1 ) {
                                var $js = $rsp[1];
                                eval($js); // jshint ignore:line
                            }
                            // pager init
                            Page.pager(id);
                        } else { // The response contains only script
                            eval(response); // jshint ignore:line
                        }
                        // afterRequest callback
                        if (Page.afterRequest) {
                            Page.afterRequest();
                        }
                    }
                    // hide overlay
                    Page.progress.stop(id);
                }
            });
        },
        /**
         * Pager helper
         * @param string id HTML container ID for the list to be paginated
        */
        pager : function(id) {
            var $pager = $('#'+id).find('.pager a[rel]');
            if ($pager.length) {
                $.each($pager, function(i, a) {
                    var $link = $(a);
                    var url = $link.attr('href');
                    $link.attr('href', '#').click(function() {
                        // attach with the existing query string
                        Page.queryStr['_' + id].page = $link.attr('rel');
                        Page.request(id, url, Page.queryStr['_' + id]);
                    });
                });
            }
        },
        /**
         * Check to see if CSS support is available in the browser
         * Inspired by https://developer.mozilla.org/en-US/docs/CSS/Tutorials/Using_CSS_animations/Detecting_CSS_animation_support
         * @param string feature The CSS feature/property name in camel case
         * @return boolean
        */
        detectCSSFeature : function(featureName) {
            var feature = false,
            domPrefixes = 'Webkit Moz ms O'.split(' '),
            elm = document.createElement('div'),
            featurenameCapital = null;

            featureName = featureName.toLowerCase();

            if ( elm.style[featureName] !== undefined ) {
                feature = true;
            }

            if ( feature === false ) {
                featurenameCapital = featureName.charAt(0).toUpperCase() + featureName.substr(1);
                for ( var i = 0; i < domPrefixes.length; i++ ) {
                    if ( elm.style[domPrefixes[i] + featurenameCapital ] !== undefined ) {
                      feature = true;
                      break;
                    }
                }
            }
            return feature;
        }
    };

    // Add under the namespace "LC"
    LC.Page = Page;

    LC.List = {
        url : LC.Page.url(LC.vars.baseDir), /* mapping directory */
        /* Initialize the ItemBrand page */
        init : function(url, opt) {
            LC.List.url = url;

            /* delete confirmation */
            $('#dialog-confirm').dialog({
                modal: true,
                autoOpen: false,
                resizable: false,
                minHeight: 120,
                buttons: [
                    {
                        text: 'Yes',
                        class: 'btn btn-danger btn-flat btn-sm',
                        click: function() {
                            $(this).dialog('close');
                            LC.Page.ItemBrand.doDelete();
                        }
                    },
                    {
                        text: 'No',
                        class: 'btn btn-warning btn-flat btn-sm',
                        click: function() {
                            $(this).dialog('close');
                        }
                    }
                ],
            });
            /* Add/Edit area */
            $('#dialog-brand').dialog({
                modal: true,
                autoOpen: false,
                resizable: false,
                width: 320,
                minHeight: 120
            });

            $('#btn-new').click(function(e) {
                e.preventDefault();
                LC.Page.ItemBrand.create();
            });

            /* Load list */
            LC.Page.ItemBrand.list();
        },
        /* Load the list */
        list : function(param) {
            $('#dialog-brand').dialog( 'close' );

            LC.Page.request( 'list', LC.Page.ItemBrand.url + 'list.php', param );

            LC.Page.afterRequest = function () {
                $('.table .actions .edit').on('click', function (e) {
                    e.preventDefault();
                    LC.Page.ItemBrand.edit($(this).attr('rel'));
                });

                $('.table .actions .delete').on('click', function (e) {
                    e.preventDefault();
                    LC.Page.ItemBrand.remove($(this).attr('rel'));
                });

                $('[data-toggle="tooltip"]').tooltip();
            };
        },
        /* Launch the dialog to create a new entry */
        create : function() {
            LC.Form.clear('form-brand');
            $('#dialog-brand').dialog('open');
        },
        /* Launch the dialog to edit an existing entry */
        edit : function(id) {
            LC.Form.clear('form-brand');
            var $data = LC.Form.getFormData('form-brand', id);
            if ($data) {
                var $form = $('#form-brand');
                $form.find('#id').val( id );
                $form.find('input[name="name"]').val($data.name);
                $('#dialog-brand').dialog('open');
            }
        },
        /* Launch the dialog to confirm an entry delete */
        remove : function( id ) {
            $('#delete-id').val(id);
            $('#dialog-confirm').dialog('open');
        },
        /* Do delete action upon confirm OK */
        doDelete : function() {
            LC.Page.request('POST', // type
                LC.Page.ItemBrand.url + 'action.php', // page to post
                { // data to post
                    id: $('#delete-id').val(),
                    action: 'delete'
                },
                function() { // callback
                    LC.Page.ItemBrand.list();
                }
            );
        }
    };

    LC.AsynFileUploader = {
        /** @var object Available hooks */
        hook: {
            /**
             * Hook to run just after file is uploaded
             * The following parameter is thrown into the hook
             *
             * @param string name           The file input element name
             *
             * @param object file           The uploaded file information
             * @param string file.name      The file input name
             * @param string file.id        The HTML id for the file browsing button
             * @param string file.fileName  The original file name to be displayed
             * @param string file.extension The uploaded file extension
             * @param string file.url       The actual file URL
             * @param string file.caption   The caption if the uploaded file is image
             * @param array  file.uploads   The uploaded file or files by dimensions
             */
            afterUpload: function(name, file) {
                if (typeof(LC.AsynFileUploader.hooks[name]) === 'object' && typeof(LC.AsynFileUploader.hooks[name].afterUpload) === 'function') {
                    LC.AsynFileUploader.hooks[name].afterUpload(name, file);
                }
            },
            /**
             * Hook to run just after file is deleted
             * The following parameter is thrown into the hook
             *
             * @param string name         The file input element name
             *
             * @param object data         The information about deletion
             * @param string data.name    The file input element name
             * @param string data.success TRUE if file deletion succeeded; otherwise FALSE
             * @param string data.error   The error message if file deletion failed
             * @param mixed  data.id      The ID deleted from DB
             * @param string data.value   The file name deleted from hard drive
             */
            afterDelete: function(name, data) {
                if (typeof(LC.AsynFileUploader.hooks[name]) === 'object' && typeof(LC.AsynFileUploader.hooks[name].afterDelete) === 'function') {
                    LC.AsynFileUploader.hooks[name].afterDelete(name, data);
                }
            },
            /**
             * Hook to run when the file upload fails with error
             *
             * @param string name  The file input element name
             *
             * @param object error       The error object
             * @param string error.id    The HTML ID which is generally given the validation key option in PHP
             * @param string error.plain The error message in plain format
             * @param string error.html  The error message in HTML format
             */
            onError: function(name, error) {
                if (typeof(LC.AsynFileUploader.hooks[name]) === 'object' && typeof(LC.AsynFileUploader.hooks[name].onError) === 'function') {
                    LC.AsynFileUploader.hooks[name].onError(name, error);
                } else {
                    $('#asynfileuploader-error-' + name).html(error.html);
                    $('#asynfileuploader-error-' + name).show();
                }
            }
        },
        /**
         * @var array User-defined hooks by file input name that can be defined using `LC.AsynFileUploader.addHook()`
         *    The available hooks are `afterUpload`, `afterDelete`, `onError`
         * @see `LC.AsynFileUploader.hook` and `LC.AsynFileUploader.addHook()`
         */
        hooks: [],
        /** @var array The file extensions allowed for image preview */
        previewAllowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
        /** @var boolean Flag if the delete process is still in progress or not */
        deleteInProgress: false,
        /** @var string The original HTML preview element */
        originalPreview: {
            content: null,
            width: 'auto',
            aRel: '',
            aTarget: ''
        },
        /**
         * Initialization
         * @param string name The name of the file input
         */
        init: function(name) {
            var $button       = $('#asynfileuploader-' + name + ' .asynfileuploader-button');
            var $progress     = $('#asynfileuploader-progress-' + name);
            var $iframe       = $('#asynfileuploader-frame-' + name);
            var borderTop     = parseInt($button.css('borderTopWidth'));
            var borderBottom  = parseInt($button.css('borderBottomWidth'));

            borderTop     = isNaN(borderTop) ? 0 : borderTop;
            borderBottom  = isNaN(borderBottom) ? 0 : borderBottom;

            $progress.width($button.width());
            $progress.height($button.height() + borderTop + borderBottom);
            $iframe.width($button.width());
            $iframe.height($button.height() + borderTop + borderBottom);

            $('#asynfileuploader-delete-' +name + ' a').click(function() {
                LC.AsynFileUploader.deleteFile($(this));
            });

            $('#asynfileuploader-error-' + name).click(function() {
                $(this).slideUp(function() {
                    $(this).html('');
                });
            });
        },
        /**
         * Do the image preview if there is a placeholder found
         * @param object file           The uploaded file information
         * @param string file.name      The file input name
         * @param string file.id        The HTML id for the file browsing button
         * @param string file.fileName  The original file name to be displayed
         * @param string file.extension The uploaded file extension
         * @param string file.url       The actual file URL
         * @param string file.caption   The caption if the uploaded file is image
         * @param array  file.uploads   The uploaded file or files by dimensions
         *
         * OR
         *
         * @param string file The file input name
         */
        preview: function(file) {
            var $preview;
            var $hyperLink;
            if (typeof(file) === 'object') {
                $preview   = $('#' + file.name + '-preview');
                $hyperLink = $preview.parent();
                var $content   = '<div class="thumbnail-preview-ext">' + file.extension + '</div>';
                if ($preview.length) {
                    if (LC.AsynFileUploader.originalPreview.content === null) {
                        LC.AsynFileUploader.originalPreview.content = $preview.html();
                        LC.AsynFileUploader.originalPreview.width = $preview.width();
                        if ($hyperLink.is('a')) {
                            LC.AsynFileUploader.originalPreview.aRel = $hyperLink.attr('rel');
                            LC.AsynFileUploader.originalPreview.aTarget = $hyperLink.attr('target');
                        }
                    }

                    if ($.inArray(file.extension.toLowerCase(), LC.AsynFileUploader.previewAllowedExtensions) !== -1) {
                        $content = '<img src="' + file.url + '" alt="' + file.fileName + '" title="' + file.fileName + '" height="' + $preview.height() + '" />';
                    }

                    if ($hyperLink.is('a')) {
                        $hyperLink.attr('href', file.url);
                        $hyperLink.attr('rel', file.url);
                        if (!$hyperLink.attr('target')) {
                            $hyperLink.attr('target', '_blank');
                        }
                    } else {
                        $content = '<a href="' + file.url + '" rel="' + file.url + '" target="_blank">' + $content + '</a>';
                    }

                    $preview.html($content);

                    var $img = $preview.find('img');
                    if ($img.length) {
                        $img.one('load', function() {
                            if ($img.width() > LC.AsynFileUploader.originalPreview.width) {
                                $img.css('margin-left', Math.floor(($img.width() - LC.AsynFileUploader.originalPreview.width) / 2) * -1);
                            }
                        });
                    }
                }

                $('#asynfileuploader-delete-' + file.name).show();
            } else {
                $preview = $('#' + file + '-preview');
                $hyperLink = $preview.parent();
                if ($preview.length) {
                    $preview.html(LC.AsynFileUploader.originalPreview.content);
                    if ($hyperLink.is('a')) {
                        $hyperLink.attr('href', '#');
                        if (LC.AsynFileUploader.originalPreview.aRel) {
                            $hyperLink.attr('rel', LC.AsynFileUploader.originalPreview.aRel);
                        } else {
                            $hyperLink.removeAttr('rel');
                        }
                        if (LC.AsynFileUploader.originalPreview.aTarget) {
                            $hyperLink.attr('target', LC.AsynFileUploader.originalPreview.aTarget);
                        } else {
                            $hyperLink.removeAttr('target');
                        }
                    }
                }
                $('#asynfileuploader-delete-' + file.name).hide();
            }
        },
        /**
         * Run just after file is uploaded
         * doing the image preview and run custom hook if defined
         * @param object file           The uploaded file information
         * @param string file.name      The file input name
         * @param string file.id        The HTML id for the file browsing button
         * @param string file.value     The uploaded file name
         * @param mixed  file.savedId   The ID in the database related to the uploaded file (if any)
         * @param string file.fileName  The original file name to be displayed
         * @param string file.url       The actual file URL
         * @param string file.extension The uploaded file extension
         * @param string file.caption   The caption if the uploaded file is image
         */
        onUpload: function(file) {
            LC.AsynFileUploader.preview(file);
            LC.AsynFileUploader.hook.afterUpload(file.name, file);
        },
        /**
         * POST to server to unlink the files
         * @param object trigger The HTML element that is clicked by user to delete file.
         */
        deleteFile: function(trigger) {
            // prevent asynchronous clicks
            if (LC.AsynFileUploader.deleteInProgress === true) {
                return false;
            }

            var name       = $(trigger).parent().attr('id').replace(/asynfileuploader-delete-/i, '');
            var url        = $('iframe#asynfileuploader-frame-' + name).attr('src').split('?')[0] || '';
            var hook       = $(trigger).attr('rel');
            var id         = '';
            var value      = '';
            var dimensions = [];

            // prerequisites
            if ( !(url && name) ) {
                return false;
            }

            LC.AsynFileUploader.deleteInProgress = true;
            // Get id, value (file name) and dimensions
            // id to delete from db
            // value to unlink the file
            // dimension to unlink the thumbnails related to the file
            $('#asynfileuploader-value-' + name + ' input[name^="' + name + '"]').each(function(i, elem) {
                if ($(elem).attr('name').indexOf('-id') !== -1) {
                    id = $(elem).val();
                } else if ($(elem).attr('name').indexOf('-dimensions[]') !== -1) {
                    dimensions.push($(elem).val());
                } else {
                    value = $(elem).val();
                }
            });

            $('#asynfileuploader-error-' + name).html('').hide();
            $('#asynfileuploader-button-' + name).hide();
            $('#asynfileuploader-progress-' + name).show();

            $.post(url, {
                action: 'delete',
                name: name,
                id: id,
                value: value,
                dir: $('input[name="' + name + '-dir"]').val(),
                dimensions: dimensions,
                onDelete: hook
            }, function(data) {
                if (data.success) {
                    // hide the displayed file name and the delete button
                    $('#asynfileuploader-name-' + name).hide();
                    $('#asynfileuploader-delete-' + name).hide();
                    // clear the values
                    $('#' + name + '-fileName').val();
                    $('#' + name + '-uniqueId').val();
                    $('#asynfileuploader-value-' + name).html('<input type="hidden" name="' + name + '" value="" />');
                    // cancel preview if image
                    LC.AsynFileUploader.preview(name);
                } else {
                    alert(data.error);
                }
                $('#asynfileuploader-button-' + name).show();
                $('#asynfileuploader-progress-' + name).hide();
                LC.AsynFileUploader.deleteInProgress = false;
                LC.AsynFileUploader.hook.afterDelete(name, data);
            }, 'json');
        },
        /**
         * Define user-defined hook
         * @param string   name The file input element name
         * @param string   hook The hook name: `afterUpload`, `afterDelete` or `onError`
         * @param function func The function definition
         */
        addHook: function(name, hook, func) {
            if ($.inArray($.trim(hook), ['afterUpload', 'afterDelete', 'onError']) !== -1) {
                if (typeof(LC.AsynFileUploader.hooks[name]) === 'undefined') {
                    LC.AsynFileUploader.hooks[name] = [];
                }
                LC.AsynFileUploader.hooks[name][hook] = func;
            }
        }
    };
    win.LC = LC;

    $(document).ready( function() {
        LC.Page.initialize();
    } );

}(window, jQuery));
