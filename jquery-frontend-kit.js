(function ($, document) {
    /**
     * click-once
     */
    $(document).on('click', '.click-once', function (e) {
        e.stopPropagation();
    });

    /**
     * Caching global error
     */
    $(document).ajaxComplete(function (event, xhr, ajaxOptions, thrownError) {
        if (xhr.status === 401) {
            $.alert({
                title: "Unauthorized",
                content: "Access to the resource has been denied. Try to authenticate again. Sorry for the inconvenience.",
                buttons: {
                    ok: {
                        text: 'Login Now',
                        btnClass: 'btn-dark',
                        action: function () {
                            window.location.assign('/');
                        }
                    }
                }
            })
        }
    });

    /**
     * Modal overlay for nested modal
     */
    (function () {
        // on show
        $(document).on('show.bs.modal', '.modal', function (event) {
            // hide page scroll bar
            $(document).find("html").css({ 'overflow-y': 'hidden' });

            // restore scroll behavior
            $(this).css('overflow-y', 'auto');

            let self = $(this);

            setTimeout(function () {
                var zIndex = 100000 + (10 * $('.modal-backdrop').length);
                self.css('z-index', zIndex);
                $(document).find('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
            }, 100);
        });

        // on hide
        $(document).on('hide.bs.modal', '.modal', function (event) {
            if ($('.modal-backdrop').length === 1) {
                $(document).find("html").css({ 'overflow-y': '' });
            }
        });
    }());

    /**
     * href query params injector
     */
    (function () {
        /**
         * Inject query param process
         * @param {JQuery<any>} self 
         */
        function injectQueryParamProcess(self) {
            // href attribute
            const hrefAttr = self.attr("data-url-attr") ?? "href";

            $(document).find(self.attr("data-target")).each((index, element) => {
                const url = new URL($(element).attr(hrefAttr));

                if (self.is(':checkbox')) {
                    if (self.prop("checked")) {
                        url.searchParams.set(self.attr("data-param") ?? self.attr("name"), self.attr("data-value") ?? self.val());
                    } else {
                        url.searchParams.delete(self.attr("data-param") ?? self.attr("name"));
                    }
                } else {
                    url.searchParams.set(self.attr("data-param"), self.attr("data-value") ?? self.val());
                }

                // set the new url
                $(element).attr(hrefAttr, url.toString());

                // trigger event on the target
                if (self.has("[data-trigger]")) {
                    $(element).trigger(self.attr("data-event") ?? "click");
                }
            });
        }

        $(document).on("click", ".inject-query-param", function (e) {
            // only checkbox and radio input
            if ($(this).is(':checkbox') || $(this).is(':radio')) {
                injectQueryParamProcess($(this));
            }
        });

        $(document).on("keyup", ".inject-query-param", function (e) {
            // only text input
            if ($(this).is(':text')) {
                injectQueryParamProcess($(this));
            }
        });

        $(document).on("change", ".inject-query-param", function (e) {
            /**
             * No text, radio, checkbox input
             */
            if (!$(this).is(':text') && !$(this).is(':radio') && !$(this).is(':checkbox')) {
                injectQueryParamProcess($(this));
            }
        });
    }());

    /**
     * Display error
     * @param {JQuery.jqXHR<any>} xhr response
     * @param {string} errorMessage error message
     */
    function displayError(xhr, errorMessage) {
        if (xhr.status !== 401) {
            if (xhr.responseJSON) {
                $.alert({
                    title: "Error",
                    content: xhr.responseJSON.message ?? errorMessage ?? "The server encountered a problem while processing the request. Try again later please. Sorry for the inconvenience."
                })
            } else {
                $.alert({
                    title: "Error",
                    content: xhr.responseText ?? errorMessage ?? "The server encountered a problem while processing the request. Try again later please. Sorry for the inconvenience."
                })
            }
        }
    }

    /**
     * Convert object to html element attributes
     * @param {any} attributes object
     * @param {string[]} omits object
     */
    function objectToHtmlAttributes(attributes, omits) {
        // attribute list
        let attrList = [];

        // generating attributes
        for (const key in attributes) {
            if (attributes.hasOwnProperty(key)) {
                if (!omits || !omits.includes(key)) {
                    const attrValue = attributes[key];
                    attrList.push(`${key}="${attrValue}"`);
                }
            }
        }

        return attrList.length !== 0 ? ` ${attrList.join(" ")}` : '';
    }

    try {
        /**
         * jQuery frontend kit
         * */
        var jfkit = {
            /**
             * Open a remote modal
             * @param {{loaderContainerSelector:string; modalId: string;onLoad: () => void|Promise<void>; onCloseMethod: () => void|Promise<void>; errorCallback: (xhr:JQuery.jqXHR<any>, status:JQuery.Ajax.ErrorTextStatus, error:string) => void|Promise<void>;event: string;triggerSelector: string; refreshButton: string;hrefParser?: (url:string) => string|Promise<string>;}} params modal setup modal
             * @returns {[() => void, () => void]}
             * */
            setupModal: (params) => {
                /**
                 * load modal content
                 * @param {JQuery} modalInstance - modal instance
                 * */
                function load(modalInstance) {
                    // start loading
                    $(params.loaderContainerSelector).LoadingOverlay('show');

                    try {
                        //real href
                        const realHref = params.hrefParser ? params.hrefParser(modalInstance.attr('href')) : modalInstance.attr('href');

                        // fetch content
                        $.get(realHref ?? modalInstance.attr('href'), function (data) {
                            $(document).find(params.modalId).find('.modal-content').html(data);

                            $(document).find(params.modalId).modal({
                                show: true,
                                backdrop: 'static',
                                keyboard: true
                            });

                            // onLoad callback
                            if (params.onLoad) {
                                params.onLoad();
                            }

                            /**
                             * Refresh the page when the modal is closed
                             */
                            $(document).find(params.modalId).off('hidden.bs.modal'); // off the previous handler if exist
                            $(document).find(params.modalId).on('hidden.bs.modal', async function (e) {
                                if (params.onCloseMethod) {
                                    await params.onCloseMethod();
                                }
                            })

                        }).fail(async (xhr, status, error) => {

                            // the user is not authorized
                            if (xhr.status === 401) {
                                $.alert({
                                    title: "Unauthorized",
                                    content: "Access to the resource has been denied. Try to authenticate again. Sorry for the inconvenience.",
                                    buttons: {
                                        ok: {
                                            text: 'Login Now',
                                            btnClass: 'btn-dark',
                                            action: function () {
                                                window.location.assign('/');
                                            }
                                        }
                                    }
                                })
                            } else {
                                // display error
                                displayError(xhr);

                                // applying success callback process
                                if (params && params.errorCallback) {
                                    await params.errorCallback(xhr, status, error);
                                }
                            }
                        }).always(function () {
                            // hide loading
                            $(params.loaderContainerSelector).LoadingOverlay('hide');
                        });
                    } catch (error) {
                        console.error('setupModal error', error);
                    }
                }

                // stop listening the modal trigger
                function offEvent() {
                    $(document).off(params.event, params.triggerSelector)
                }

                // off event before adding a new one
                offEvent();

                // listen to modal opening
                $(document).on(params.event, params.triggerSelector, function (e) {
                    e.preventDefault();

                    // triggerer
                    const triggerer = $(this);

                    // load content
                    load(triggerer);

                    // Refresh button
                    if (params.refreshButton) {
                        // off the previous listener
                        $(document).find(params.modalId).off("click", params.refreshButton)

                        // listen to refresh buton
                        $(document).find(params.modalId).on('click', params.refreshButton, function (e) {
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            // reload the component
                            load($(this).attr('href') ? $(this) : triggerer);
                        })
                    }
                })

                return [load, offEvent];
            },

            /**
             * Load a section content
             * @param {string} sectionSelector - section selector
             * @param {string} urlArr - url attribute
             * @returns {params: {queryParams?: any; beforeStart: () => void | Promise; successCallback: () => void | Promise; errorCallback: (xhr: JQuery.jqXHR<any>, status: JQuery.Ajax.ErrorTextStatus, error) => void | Promise; finishCallback: () => void | Promise; } | undefined): JQueryPromise}
             * */
            loadContent: (sectionSelector, urlAttr, refreshButtonSelector = ".btn-app-error-refresh") => {
                // section
                let section = $(sectionSelector);

                // get default css
                const defaultCss = {
                    minHeight: section.css("minHeight"),
                    background: section.css("background"),
                    marginTop: section.css("marginTop"),
                    position: section.css("position")
                };

                // set minimum height
                section.css({ minHeight: "150px", background: "white", marginTop: "4rem", position: "relative" })

                /**
                 * Load content
                 * @param {{url?:string; queryParams?: any, beforeStart: () => void|Promise , successCallback: () => void|Promise ,errorCallback: () => void|Promise ,finishCallback: () => void|Promise}|undefined} params parameters
                 * @returns {JQueryPromise<any>}
                 **/
                async function load(params) {

                    // show loader
                    section.LoadingOverlay('show');

                    // update refresh button state
                    if (refreshButtonSelector) {
                        $(document).find(refreshButtonSelector).prop('disabled', true);
                        $(document).find(refreshButtonSelector).find('.fa').addClass("fa-spin");
                    }

                    // applying before start process
                    if (params && params.beforeStart) {
                        await params.beforeStart();
                    }

                    try {
                        // url
                        const url = new URL(params.url ?? section.attr(urlAttr));
                        // inject query params
                        if (params.queryParams) {
                            for (const key in params.queryParams) {
                                if (params.queryParams.hasOwnProperty(key)) {
                                    const keyValue = params.queryParams[key];
                                    url.searchParams.set(key, keyValue);
                                }
                            }
                        }

                        // fetch data
                        await $.get(url.toString(), async function (data) {
                            // set content
                            section.html(data);

                            // applying success callback process
                            if (params && params.successCallback) {
                                await params.successCallback();
                            }
                        }).fail(async (xhr, status, error) => {

                            // the user is not authorized
                            if (xhr.status === 401) {
                                $.alert({
                                    title: "Unauthorized",
                                    content: "Access to the resource has been denied. Try to authenticate again. Sorry for the inconvenience.",
                                    buttons: {
                                        ok: {
                                            text: 'Login Now',
                                            btnClass: 'btn-dark',
                                            action: function () {
                                                window.location.assign('/');
                                            }
                                        }
                                    }
                                })
                            } else {
                                // display error
                                displayError(xhr);

                                // applying success callback process
                                if (params && params.errorCallback) {
                                    await params.errorCallback(xhr, status, error);
                                }
                            }
                        }).always(async function () {
                            // restore css
                            section.css(defaultCss);

                            // stop loader
                            section.LoadingOverlay('hide');

                            // update refresh button state
                            if (refreshButtonSelector) {
                                $(document).find(refreshButtonSelector).prop('disabled', false);
                                $(document).find(refreshButtonSelector).find('.fa').removeClass("fa-spin");
                            }

                            // applying finish callback process
                            if (params && params.finishCallback) {
                                await params.finishCallback();
                            }

                            // off the previous listener
                            $(document).find(sectionSelector).off("click", refreshButtonSelector)

                            // listen to refresh buton
                            $(document).find(sectionSelector).on('click', refreshButtonSelector, function (event) {
                                event.preventDefault();

                                // reload the component
                                load({
                                    url: $(this).attr('href'),
                                    beforeStart: params.beforeStart,
                                    errorCallback: params.errorCallback,
                                    finishCallback: params.finishCallback,
                                    successCallback: params.successCallback
                                });

                                // console.log($(this))
                            })
                        });
                    } catch (error) {

                    }
                }

                // load
                return load;
            },

            /**
            * Items state
            * @param {string[]|string} list - list of string
            * @returns {[string[], (value) => void, (value) => void, (separator = ',') => string, () => void]}
            **/
            useItems: (list) => {
                const items = !!list ? Array.isArray(list) ? list : list.split(",") : [];

                function addItem(value) {
                    if (!items.find(item => item === value))
                        items.push(value);
                }

                function removeItem(value) {
                    const index = items.indexOf(value);
                    if (index !== -1)
                        items.splice(index, 1)
                }

                function join(separator = ',') {
                    return items.join(separator);
                }

                function clear() {
                    items.splice(0, items.length)
                }

                function getItems() {
                    return items;
                }

                return [getItems(), addItem, removeItem, join, clear]
            }
        };

        /**
         * Make jfkit available globaly
         * */
        window.jfkit = jfkit;

    } catch (error) {
        console.log("Global process error", error)
    }

    /**
     * Define a form modal
     * @param {{modalId:string; openBtn: string; hrefParser?: (url:string) => string|Promise<string>; openLoadingContainer?:string; refreshBtn?: string; onOpen?: () => void|Promise<void>; onClose?: () => void|Promise<void>; errorMessage?: string; successMessage?:string; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parameters
     */
    window.defineDetailsModal = (options) => {
        // defaults options
        var params = $.extend({
            openLoadingContainer: 'body'
        }, options);

        // setup edition modal
        window.jfkit.setupModal({
            event: 'click',
            triggerSelector: params.openBtn,
            modalId: params.modalId,
            loaderContainerSelector: params.openLoadingContainer,
            hrefParser: params.hrefParser,
            refreshButton: params.refreshBtn,
            onLoad: () => {
                if (params.onOpen) {
                    params.onOpen();
                }
            },
            onCloseMethod: () => {
                if (params.onClose) {
                    params.onClose();
                }
            }
        });
    };

    /**
     * Define a form modal
     * @param {{modalId:string; openBtn: string; hrefParser?: (url:string) => string|Promise<string>; form: string; method?: string; resetOnSuccess?: boolean; openLoadingContainer?:string; submitLoadingContainer?:string; refreshBtn?: string; onOpen?: () => void|Promise<void>; onClose?: () => void|Promise<void>; formActionParser?: (url:string) => string|Promise<string>; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parameters
     */
    window.defineFormModal = (options) => {
        // defaults options
        var params = $.extend({
            resetOnSuccess: false,
            openLoadingContainer: 'body',
            method: 'post'
        }, options);

        // cancel previous listener
        $(document).off("submit", params.form);

        // add new listener
        $(document).on("submit", params.form, function (e) {
            e.preventDefault();

            // get form element
            const formElement = $(this).get()[0];

            // set form data
            let formData = new FormData(formElement)

            // start loading
            if (params.submitLoadingContainer) {
                $(params.submitLoadingContainer).LoadingOverlay("show");
            } else {
                $(params.modalId).find('.modal-content').LoadingOverlay("show");
            }

            // submit data
            $.ajax({
                url: params.formActionParser ? params.formActionParser($(this).attr("action")) : $(this).attr("action"),
                data: formData,
                processData: false,
                contentType: false,
                cache: false,
                type: params.method,
                success: function (data, status, xhr) {
                    // response processing
                    if (xhr.responseJSON) {
                        $.alert({
                            title: 'Success',
                            type: 'green',
                            content: params.successMessage ?? jqXhr.responseJSON.message ?? 'the operation was successful.'
                        })
                    } else {
                        // replace the current content
                        $(document).find(params.modalId).find('.modal-content').html(data);
                    }

                    if (params.resetOnSuccess) {
                        // reset form
                        formElement.reset();
                    }

                    // success callback
                    if (params.onSuccess) {
                        params.onSuccess(data, status, xhr);
                    }
                },
                error: (jqXhr) => {
                    if (jqXhr.responseJSON) {
                        $.alert({
                            title: 'Operation failed',
                            type: 'red',
                            content: params.errorMessage ?? jqXhr.responseJSON.message ?? 'The server encountered a problem while processing your request, please try again later.'
                        })
                    } else {
                        $.alert({
                            title: 'Operation failed',
                            type: 'red',
                            content: params.errorMessage ?? jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.'
                        })
                    }

                    // fail callback
                    if (params.onFail) {
                        params.onFail(jqXhr);
                    }
                },
                complete: () => {
                    // stop loading
                    if (params.submitLoadingContainer) {
                        $(params.submitLoadingContainer).LoadingOverlay("hide");
                    } else {
                        $(params.modalId).find('.modal-content').LoadingOverlay("hide");
                    }
                }
            });
        });

        // setup edition modal
        window.jfkit.setupModal({
            event: 'click',
            triggerSelector: params.openBtn,
            modalId: params.modalId,
            loaderContainerSelector: params.openLoadingContainer,
            hrefParser: params.hrefParser,
            refreshButton: params.refreshBtn,
            onLoad: () => {
                if (params.onOpen) {
                    params.onOpen();
                }
            },
            onCloseMethod: () => {
                if (params.onClose) {
                    params.onClose();
                }
            }
        });
    }

    /**
     * Define delete dialog for resource deletion
     * @param {{actionBtn: string; type?: "delete"|"restore"; resourceLabelAttr?:string; resourceUrlAttr?:string; method?:string; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parametrs
     */
    window.defineDeleteOrRestoreDialog = (options) => {
        // defaults options
        var params = $.extend({
            resourceLabelAttr: 'data-name',
            resourceUrlAttr: "href",
            method: 'delete',
            type: "delete"
        }, options);

        $(document).off('click', params.actionBtn);
        $(document).on('click', params.actionBtn, function (e) {
            e.preventDefault();

            const self = $(this);

            const confirm = $.confirm({
                type: 'dark',
                title: 'Confirmation',
                content: `Do you really want to ${params.type} the resource "<strong>${self.attr(params.resourceLabelAttr)}</strong>"`,
                buttons: {
                    yes: {
                        text: 'Yes',
                        action: function () {
                            confirm.showLoading(true);

                            $.ajax({
                                url: $(self).attr(params.resourceUrlAttr),
                                data: {
                                    _method: params.method
                                },
                                processData: false,
                                contentType: false,
                                cache: false,
                                type: params.method,
                                success: function (data, status, xhr) {
                                    if (xhr.responseJSON) {
                                        $.alert({
                                            icon: 'fa fa-check text-success',
                                            title: "Success",
                                            type: "green",
                                            content: params.successMessage ?? xhr.responseJSON.message ?? "The resource has been successfully deleted",
                                            onClose: function () {
                                                // success callback
                                                if (params.onSuccess) {
                                                    params.onSuccess(data, status, xhr);
                                                }
                                            }
                                        });
                                    } else {
                                        $.alert({
                                            icon: 'fa fa-check text-success',
                                            title: "Success",
                                            type: "green",
                                            content: params.successMessage ?? xhr.responseText ?? "The resource has been successfully deleted",
                                            onClose: function () {
                                                // success callback
                                                if (params.onSuccess) {
                                                    params.onSuccess(data, status, xhr);
                                                }
                                            }
                                        });
                                    }
                                },
                                error: (jqXhr) => {
                                    if (jqXhr.responseJSON) {
                                        $.alert({
                                            title: `Failed to ${params.type} the resource`,
                                            type: 'red',
                                            content: params.errorMessage ?? jqXhr.responseJSON.message ?? 'The server encountered a problem while processing your request, please try again later.',
                                            onClose: function () {
                                                // fail callback
                                                if (params.onFail) {
                                                    params.onFail(jqXhr);
                                                }
                                            }
                                        })
                                    } else {
                                        $.alert({
                                            title: `Failed to ${params.type} the resource`,
                                            content: params.errorMessage ?? jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.',
                                            onClose: function () {
                                                // fail callback
                                                if (params.onFail) {
                                                    params.onFail(jqXhr);
                                                }
                                            }
                                        })
                                    }
                                },
                                complete: () => {
                                    confirm.hideLoading(true);
                                    confirm.close();
                                }
                            });
                            return false;
                        }
                    },
                    no: function () {
                    }
                }
            });
        });
    }

    /**
     * Define delete or restore items dialog
     * @param {{container?: string; actionBtn: string; type?: "delete"|"restore"; checkboxItem: string; nameKey?:string; urlParam?: string; urlAttr?: string; method?:string; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>; onComplete: () => void|Promise<void>; onCancel: () => void|Promise<void>;}} options parameters
     */
    window.defineGroupDeleteOrRestoreDialog = function (options) {

        // defaults options
        var params = $.extend({
            container: 'body',
            localItemsKey: 'local-items',
            nameKey: 'name',
            method: 'delete',
            type: "delete",
            urlAttr: 'href',
            urlParam: ':id'
        }, options);

        /**
         * Delete document requests
         */
        $(document).off("click", `${params.container} ${params.actionBtn}`);
        $(document).on("click", `${params.container} ${params.actionBtn}`, function (event) {

            // button
            const self = $(this);

            /**
             * @type {Array<{name: string; url: string;}>} resources list
             */
            const resources = [];

            /**
             * @type {string[]} resource IDs
             */
            let data = self.data(params.localItemsKey);

            if (!Array.isArray(data)) {
                data = [data];
            }

            for (const id of data) {
                $(document).find(params.container).find(params.checkboxItem).each(function (_index, checkbox) {
                    if ($(checkbox).val() === id) {
                        resources.push({
                            name: $(checkbox).data(params.nameKey),
                            url: self.attr(params.urlAttr).replace(params.urlParam, id)
                        });
                    }
                });
            }

            /**
             * At least one item need to be selected
             */
            if (resources.length !== 0) {
                $.confirm({
                    type: 'dark',
                    title: 'Confirm',
                    content: `Do you really want to ${params.type} ${resources.length > 1 ? `the ${resources.length} seleted elements` : 'the selected element'}?`,
                    buttons: {
                        confirm: function () {
                            $.alert({
                                type: 'dark',
                                title: `<div><i class="fa fa-refresh fa-spin"></i> ${params.type === 'restore' ? 'Restoring' : 'Deleting'}...</div>`,
                                content: `<div style="font-size: 14px;">
                                <div><span class="success-count" style="color: green; margin-right: 5px;">0</span> successful</div>
                                <div><span class="fail-count" style="color: red; margin-right: 5px;">0</span> failed</div>
                            </div>`,
                                onContentReady: function () {
                                    var self = this;
                                    // counters
                                    let success = 0;
                                    let errorCount = 0;

                                    const promise = new Promise(async (resolve, reject) => {
                                        // hide ok button
                                        this.$$ok.hide();

                                        // delete items
                                        for (let index = 0; index < resources.length; index++) {
                                            const resource = resources[index];

                                            try {
                                                // submit delete request
                                                await $.ajax({
                                                    url: resource.url,
                                                    processData: false,
                                                    contentType: false,
                                                    cache: false,
                                                    type: params.method,
                                                    success: function (data, status, xhr) {
                                                        // increment counter
                                                        success = Number(success) + Number(1);
                                                        self.$content.find(".success-count").text(`${success}/${resources.length}`);

                                                        // success callback
                                                        if (params.onSuccess) {
                                                            params.onSuccess(data, status, xhr);
                                                        }
                                                    },
                                                    error: (error) => {
                                                        // increment counter
                                                        errorCount = Number(errorCount) + Number(1);
                                                        self.$content.find(".fail-count").text(`${errorCount}/${resources.length}`);

                                                        if (error.responseJSON) {
                                                            $.alert({
                                                                type: 'red',
                                                                title: `Operation failed`,
                                                                content: `<span style="font-size: 14px;">${params.errorMessage ?? error.responseJSON.message ?? `Failed to delete the resource <strong>${resource.name}`}</span>`
                                                            })
                                                        } else {
                                                            $.alert({
                                                                type: 'red',
                                                                title: `Operation failed`,
                                                                content: `<span style="font-size: 14px;">${params.errorMessage ?? error.responseText ?? `Failed to delete the resource <strong>${resource.name}`}</span>`
                                                            })
                                                        }

                                                        // fail callback
                                                        if (params.onFail) {
                                                            params.onFail(error);
                                                        }
                                                    },
                                                    complete: () => { }
                                                });
                                            } catch (e) {
                                                $.alert({
                                                    type: 'red',
                                                    title: 'Error',
                                                    content: `<span style="font-size: 14px;">${params.errorMessage ?? e.message ?? "Something went wrong while processing your request. Try again later, please."}</span>`
                                                })
                                            }
                                        }

                                        // remove refresh spinner
                                        this.$title.find('.fa-refresh').hide();

                                        // show ok button
                                        this.$$ok.show();

                                        // resolve
                                        resolve();
                                    });

                                    promise.finally(function () {
                                        // on complete callback
                                        if (params.onComplete) {
                                            params.onComplete();
                                        }
                                    })
                                },
                                buttons: {
                                    ok: function () {
                                    }
                                }
                            });
                        },
                        cancel: function () {
                            // cancel callback
                            if (params.onCancel) {
                                params.onCancel();
                            }
                        }
                    }
                });
            }
        });
    }

    /**
     * Load options form remote address
     * @param {{readOnly: boolean; placeholder: string;ignorePlaceholder:boolean;urlAttr:string; defaultValueAttr: string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} options options
     */
    $.fn.remoteSelect = function (options) {
        /**
         * @param {{readOnly: boolean; placeholder: string;ignorePlaceholder:boolean;urlAttr:string; defaultValueAttr:string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} settings options
         */
        var settings = $.extend({
            readOnly: false,
            urlAttr: 'href',
            defaultValueAttr: 'value',
            ignorePlaceholder: false,
            renderItem: function (data) {
                return {
                    value: data,
                    label: data
                }
            },
            renderAttributes: function (data) {
                return {};
            }
        }, options);

        return this.each(function (index, input) {
            // checking if the selected element is an input
            if ($(input).is("select")) {
                // json
                try {
                    // toggle loading
                    $(input).addClass("ui-autocomplete-loading");
                    // disable input
                    // $(input).prop("disabled", true);
                    // fetching options
                    $.getJSON($(input).attr(settings.urlAttr), {}, function (data) {
                        // at least one result
                        if (data.length !== 0) {
                            // remove previous options
                            // $(input).find("option").remove();

                            // // add default option
                            // if (!settings.ignorePlaceholder) {
                            //     $(input).append($(`<option value="">${settings.placeholder ?? $(input).attr("aria-placeholder") ?? "-- select an item --"}</option>`));
                            // }

                            // default value
                            let defaultValue = `${$(input).attr(settings.defaultValueAttr) ?? ''}`.split(',');

                            // // add new options
                            // for (const item of data) {
                            //     // render option data
                            //     const option = settings.renderItem(item);
                            //     // render the option
                            //     $(input).append($(`<option${defaultValue.includes(option.value) ? ' selected' : ''} value="${option.value}"${objectToHtmlAttributes(settings.renderAttributes(item), ['value'])}>${option.label}</option>`));
                            // }

                            // options
                            const options = [
                                ...data.map((item, index) => {
                                    // render option data
                                    const option = settings.renderItem(item);

                                    return {
                                        text: option.label, // Required
                                        value: option.value, // Optional - value will be set by text if not set
                                        selected: defaultValue.includes(option.value),
                                    }
                                })
                            ];

                            // inject placeholder
                            if (settings.ignorePlaceholder === false) {
                                options.unshift({
                                    text: $(input).attr("data-placeholder") ?? 'Select item...',
                                    placeholder: true,
                                })
                            }

                            /**
                             * Initialize select
                             */
                            new SlimSelect({
                                select: $(input).get(0),
                                allowDeselect: true,
                                hideSelectedOption: true,
                                data: options
                            });
                        }
                    }).fail(async (xhr) => {
                        displayError(xhr);
                    }).always(function () {
                        // toggle loading
                        $(input).removeClass("ui-autocomplete-loading");
                        // disable input
                        // $(input).prop("disabled", settings.readOnly || false);
                    });
                } catch (e) {

                }
            } else {
                console.log("remoteSelect function can only be apply on select input");
            }
        });
    };

    /**
     * Display chekbox inputs from remote list
     * @param {{urlAttr: string; checkboxNameAttr:string; defaultValueAttr:string; renderItem: (data:any) => {value:string|number; label:string;};labelAttributes:(data:any) => any;inputAttributes:(data:any) => any;}} options 
     */
    $.fn.remoteCheckbox = function (options) {
        /**
         * @param {{urlAttr: string; checkboxNameAttr:string; defaultValueAttr:string; renderItem: (data:any) => {value:string|number; label:string;};labelAttributes:(data:any) => any;inputAttributes:(data:any) => any;}}
         */
        var settings = $.extend({
            urlAttr: 'href',
            checkboxNameAttr: 'data-checkbox-name',
            defaultValueAttr: 'data-default-value',
            renderItem: function (data) {
                return {
                    value: data,
                    label: data
                }
            },
            labelAttributes: function (data) {
                return {};
            },
            inputAttributes: function (data) {
                return {};
            }
        }, options);

        return this.each(function (index, section) {
            // json
            try {
                // toggle loading
                $(section).LoadingOverlay("show");
                // fetching options
                $.getJSON($(section).attr(settings.urlAttr), {}, function (data) {
                    // at least one result
                    if (data.length !== 0) {
                        // default values
                        const defaultValues = ($(section).attr(settings.defaultValueAttr) ?? '').split(',');
                        // add new options
                        for (const item of data) {
                            // render option data
                            const option = settings.renderItem(item);
                            // render the option
                            $(section).append($(`<label${objectToHtmlAttributes(settings.labelAttributes(item))}><input${objectToHtmlAttributes(settings.inputAttributes(item), ["type", "value", "checked", $(section).attr(settings.checkboxNameAttr) ? "name" : undefined])} name="${$(section).attr(settings.checkboxNameAttr)}" type="checkbox" value="${option.value}"${defaultValues.includes(option.value) ? ' checked' : ''}/>${option.label}</label>`));
                        }
                    }
                }).fail(async (xhr) => {
                    displayError(xhr);
                }).always(function () {
                    // toggle loading
                    $(section).LoadingOverlay("hide");
                });
            } catch (e) {

            }
        });
    };

    /**
     * Load autocomplete with remote data
     * @param {{readOnly:boolean; hiddenInputSelector?:string; urlAttr:string; defaultValueAttr?:string; appendTo?:string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} options options
     */
    $.fn.remoteAutocomplete = function (options) {
        /**
         * @param {{readOnly:boolean; hiddenInputSelector?:string; urlAttr:string; defaultValueAttr?:string; appendTo?:string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} settings options
         */
        var settings = $.extend({
            readOnly: false,
            urlAttr: 'href',
            defaultValueAttr: 'data-value',
            renderItem: function (data) {
                return {
                    value: data,
                    label: data
                }
            },
            renderAttributes: function (data) {
                return {};
            }
        }, options);

        return this.each(function (index, input) {
            // checking if the selected element is an input
            if ($(input).is("input:text")) {
                // setting the value in the hidden input
                const setHiddenInputValue = (value) => {
                    if (settings.hiddenInputSelector) {
                        const hiddenInput = $(input).closest('form').find(settings.hiddenInputSelector);
                        // set the default value
                        hiddenInput.val(value);
                    }
                }

                // json
                try {
                    // update input state
                    $(input).prop('disabled', settings.readOnly);

                    // set the default value
                    setHiddenInputValue($(input).attr(settings.defaultValueAttr) ?? '');

                    // defining autocomplete
                    $(input).autocomplete({
                        minLength: 2,
                        appendTo: settings.appendTo,
                        source: function (request, response) {
                            // term
                            var term = request.term;

                            // building request URL
                            const url = new URL($(input).attr(settings.urlAttr));
                            url.searchParams.set('term', term);

                            // fetch data
                            $.getJSON(url.toString(), request, function (data, status, xhr) {
                                // render options
                                const options = data.map((item) => {
                                    const option = settings.renderItem(item);
                                    return option;
                                })
                                // set data
                                response(options);
                            });
                        },
                        select: function (_event, ui) {
                            // set hidden input value
                            setHiddenInputValue(ui.item.value);
                            // set value
                            $(input).val(ui.item.label);
                            // default value
                            $(input).attr(settings.defaultValueAttr, ui.item.value);
                            // prevent default
                            return false;
                        }
                    });
                } catch (e) {

                }
            } else {
                console.log("remoteAutocomplete function can only be apply on text input");
            }
        });
    };


    /**
     * Table actions
     * @param {{itemsDataKey?: string; localItemsDataKey?: string; resourceDataKey?: string; itemActionDataKey?: string; groupActionDataKey?: string; urlAttr?: string; checkboxItem: string; selectAll: string; groupMatch: {[key:string]:string|Array<string>}; stopPropagation?: boolean}} options options
     */
    $.fn.tableActions = function (options) {

        var settings = $.extend({
            itemsDataKey: 'all-items',
            localItemsDataKey: 'local-items',
            resourceDataKey: 'id',
            itemActionDataKey: 'item-action',
            groupActionDataKey: 'group-action',
            urlAttr: 'href',
            groupMatch: {
                '[data-deleted="true"]': [".btn-restore", 'local-items'],
                '[data-deleted="false"]': [".btn-delete", 'local-items']
            },
            stopPropagation: true
        }, options);

        /**
         * Initialize selected checkbox
         * @param {JQuery<HTMLElement>} container table container
         */
        function initializeSelectedCheckbox(container) {
            if (container.data(settings.itemsDataKey)) {
                for (const value of container.data(settings.itemsDataKey)) {
                    container.find(settings.checkboxItem).each(function (_index, checkbox) {
                        if ($(checkbox).val() === value) {
                            $(checkbox).prop('checked', true);
                            $(checkbox).trigger("change");
                        }
                    });
                }
            }
        }

        /**
         * Toggle actions
         * @param {JQuery<HTMLElement>} container container
         */
        function toggleActions(container) {
            /**
             * Checking if there is at least on checked input
             */
            if (container.find(`${settings.checkboxItem}:checked`).length !== 0) {
                /**
                 * @var {string[]} selected selected items
                 */
                let selected = container.data(settings.itemsDataKey) ?? [];

                if (!Array.isArray(selected)) {
                    selected = [selected];
                }

                if (selected.length > 1) {
                    // show global group action buttons
                    container.find(`[data-${settings.groupActionDataKey}]`).not(Object.values(settings.groupMatch).map((value) => {
                        if (Array.isArray(value) && value.length !== 0) {
                            return value[0];
                        } else {
                            return value;
                        }
                    }).join(',')).each((_index, action) => {
                        $(action).fadeIn(300);
                    });
                    // hide item action buttons
                    container.find(`[data-${settings.itemActionDataKey}]`).fadeOut(300);
                } else if (selected.length === 1) {
                    // show item action buttons
                    container.find(`[data-${settings.itemActionDataKey}]`).each((_index, action) => {
                        // update resource id
                        $(action).data(settings.resourceDataKey, selected[0]);
                        // display the button
                        $(action).fadeIn(300);
                    });
                } else {
                    // hide all actions buttons
                    container.find(`[data-${settings.itemActionDataKey}], [data-${settings.groupActionDataKey}]`).fadeOut(300);
                }
            } else {
                // hide all actions buttons
                container.find(`[data-${settings.itemActionDataKey}], [data-${settings.groupActionDataKey}]`).fadeOut(300);
            }
        }

        /**
         * Set items count
         * @param {JQuery<HTMLElement>} action action (button)
         * @param {number} count items count
         */
        function setItemsCount(action, count) {
            // set items count indicator
            if (action.find('.items-count').length === 0) {
                action.append($(`<span class="items-count" style="margin-left: 8px;">(${count})</span>`));
            } else {
                action.find('.items-count').text(`(${count})`);
            }
        }

        /**
         * Checkbox change callback
         * @param {JQuery<HTMLElement>} container Container list
         */
        function changeCallback(container) {
            // all selected list
            const selectedList = $(`${settings.checkboxItem}:checked`).map(function () {
                return $(this).val();
            }).get();

            // set selected list data
            container.data(settings.itemsDataKey, selectedList);

            /**
             * Group match
             * ===================
             */
            for (const groupKey of Object.keys(settings.groupMatch)) {
                // selected list
                const selected = container.find(`${settings.checkboxItem}${groupKey}:checked`).map(function () {
                    return $(this).val();
                }).get();

                // key value
                const keyValue = settings.groupMatch[groupKey];

                if (Array.isArray(keyValue)) {
                    // action button
                    const action = container.find(keyValue[0]);
                    // selected count
                    if (selected.length !== 0) {
                        // set items count indicator
                        setItemsCount(action, selected.length);
                        // set selected value
                        action.data(keyValue.length > 1 ? keyValue[1] : settings.localItemsDataKey, selected);
                        // show action
                        action.fadeIn(300);
                    } else {
                        // hide action
                        action.fadeOut(300);
                    }
                } else {
                    // action button
                    const action = container.find(keyValue);
                    // selected count
                    if (selected.length !== 0) {
                        // set items count indicator
                        setItemsCount(action, selected.length);
                        // set selected value
                        action.data(settings.localItemsDataKey, selected);
                        // show action
                        action.fadeIn(300);
                    } else {
                        // hide action
                        action.fadeOut(300);
                    }
                }
            }

            /**
             * Toggle actions
             */
            toggleActions(container);
        }

        return this.each(function (index, element) {
            // container
            const container = $(element);

            // checkboxes initialization
            initializeSelectedCheckbox(container);

            // toggle actions (initialization)
            toggleActions(container);

            /**
             * Listen to checkbox click and stop propagation because there is another handler on the top (tr)
             */
            if (settings.stopPropagation) {
                $(document).on("click", `${settings.checkboxItem}`, function (event) {
                    // prevent up handlers to catch the event            
                    event.stopPropagation();
                });
            }

            /**
             * Listen to checkbox item change
             */
            $(document).off("change", `${settings.checkboxItem}`);
            $(document).on("change", `${settings.checkboxItem}`, function (event) {
                changeCallback(container);
            });

            /**
             * Listen to select all checkbox
             */
            $(document).off('change', `${settings.selectAll}`);
            $(document).on('change', `${settings.selectAll}`, function (event) {
                const self = $(this);
                container.find(settings.checkboxItem).each((_index, elem) => {
                    $(elem).prop("checked", self.prop("checked"));
                });

                // watch selected
                changeCallback(container);
            });
        });
    }
})(jQuery, document)