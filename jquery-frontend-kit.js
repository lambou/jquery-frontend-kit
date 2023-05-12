/**
 * Required
 *  - jQuery v3.3.1
 *  - cleave v1.6.0
 *  - jQuery loading-overlay v2.1.7
 *  - jQuery confirm v3.3.4
 *  - jQuery UI v1.12.1
 *  - Slimselect v1.27.0
 */

(function ($, document) {
    try {
        $.xhrPool = [];

        $.xhrPool.abortAll = function () {
            $.each(this, function (jqXHR) {
                try {
                    jqXHR?.abort();
                } catch (error) {
                    console.info('jqXHR.abort', error);
                }
            });
        };

        $.ajaxSetup({
            beforeSend: function (jqXHR) {
                $.xhrPool.push(jqXHR);
            },
            complete: function (jqXHR) {
                var index = $.xhrPool.indexOf(jqXHR);
                if (index > -1) {
                    $.xhrPool.splice(index, 1);
                }
            }
        });
    } catch (xhrPoolError) {
        console.info("xhrPoolError", xhrPoolError);
    }

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
                content: $(`<span>${xhr.responseJSON?.message ?? "Access to the resource has been denied. Try to authenticate again. Sorry for the inconvenience."}</span>`).text(),
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

        /**
         * Required with initialization after ajax request
         */
        if (!xhr.responseJSON) {
            $(document).find('.required-with').trigger("change", ["global-init"]);
            $(document).find('.required-without').trigger("change", ["global-init"]);
        }
    });

    /**
     * Display toggle
     */
    $(document).on('click', '.display-toggle', function (e) {
        // load display value
        const displayValue = $(this).data('displayValue') ?? 'block';
        // load container selector
        const containerSelector = $(this).data('container');

        // toggle container
        $(document).find(containerSelector).each((_index, element) => {
            if ($(element).is(':visible')) {
                $(element).css({ 'cssText': "display: none !important;" });
            } else {
                $(element).css({ display: displayValue });
            }
        });

        // toggle icon
        if ($(this).hasClass("fa-eye")) {
            $(this).removeClass("fa-eye").addClass("fa-eye-slash");
        } else {
            $(this).removeClass("fa-eye-slash").addClass("fa-eye");
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
            // console.log("$('.modal-backdrop').length", $('.modal-backdrop').length, self.css('z-index'));
            setTimeout(function () {
                // highest z index
                let highestZIndex = 0;

                // console.log("modal backdrop count", $('.modal-backdrop').length);

                try {
                    for (const backdrop of $('.modal-backdrop').toArray()) {
                        // console.log("backdrop.css('z-index')", backdrop.style.zIndex);

                        const currentZIndex = Number(`${backdrop.style.zIndex}`.length !== 0 ? backdrop.style.zIndex : 1000);

                        if (Number(highestZIndex) < currentZIndex) {
                            highestZIndex = currentZIndex;
                        }
                    }
                    // console.log("highestZIndex", highestZIndex);

                    // console.log("100ms $('.modal-backdrop').length", $('.modal-backdrop').length)
                    const zIndex = highestZIndex + 1;
                    self.css('z-index', zIndex + 1);
                    $(document).find('.modal-backdrop').not('.modal-stack').css('z-index', zIndex).addClass('modal-stack');
                } catch (error) {
                    console.log("bug while dealing with modal", error);
                }
            }, 100);
        });

        // on hide
        $(document).on('hide.bs.modal', '.modal', function (event) {
            if ($('.modal-backdrop').length === 1) {
                $(document).find("html").css({ 'overflow-y': '' });
            }

            try {
                $.xhrPool.abortAll()
            } catch (xhrPoolAbortAllError) {
                console.log("$.xhrPool.abortAll error", xhrPoolAbortAllError);
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
            var hrefAttr = self.attr("data-url-attr") ?? "href";
            // value attribute
            var valueAttr = self.data('value-attr') ?? self.attr("data-value-attr") ?? "data-value";

            $(document).find(self.attr("data-target")).each((index, element) => {
                var url = new URL($(element).attr(hrefAttr));
                var value = self.attr(valueAttr) ?? self.val();

                // slim value
                if (self.get(0) && self.get(0).slim) {
                    value = self.get(0).slim.selected();
                }

                var valueIsFilled = value && value.length !== 0 && !["null", "undefined"].includes(value.toLowerCase());

                if (self.is(':checkbox')) {
                    if (self.prop("checked") && valueIsFilled) {
                        url.searchParams.set(self.attr("data-param") ?? self.attr("name"), value);
                    } else {
                        url.searchParams.delete(self.attr("data-param") ?? self.attr("name"));
                    }
                } else if (self.is(':text') || valueIsFilled) {
                    url.searchParams.set(self.attr("data-param"), value);
                } else {
                    url.searchParams.delete(self.attr("data-param"));
                }

                // set the new url
                $(element).attr(hrefAttr, url.toString());

                // trigger event on the target
                if (self.has("[data-trigger]")) {
                    $(element).trigger(self.attr("data-event") ?? "click");
                }
            });
        }

        /**
         * Check events to be watched
         * @param {string} eventsBase events base from data-event
         * @param {string|Array<string>} lookup events to lookup
         */
        function checkEvents(eventsBase, lookup) {
            var events = `${eventsBase ?? ''}`.split(',');
            if (!Array.isArray(lookup)) {
                lookup = [lookup];
            }
            for (var event of lookup) {
                if (events.includes(event)) {
                    return true;
                }
            }
            return false;
        }

        $(document).on("click", ".inject-query-param", function (e) {
            e.stopPropagation();

            // only checkbox and radio input
            if ($(this).is(':checkbox') || $(this).is(':radio') || checkEvents($(this).attr('data-event'), "click")) {
                injectQueryParamProcess($(this));
            }
        });

        $(document).on("keyup", ".inject-query-param", function (e) {
            // only text input
            if ($(this).is(':text') || checkEvents($(this).attr('data-event'), "keyup")) {
                injectQueryParamProcess($(this));
            }
        });

        $(document).on("change", ".inject-query-param", function (e) {
            /**
             * No text, radio, checkbox input
             */
            var blackListCheck = !($(this).is('[data-autocomplete]') || $(this).is('[autocomplete]')) && !$(this).is(':radio') && !$(this).is(':checkbox');

            if (checkEvents($(this).attr('data-event'), "change") || blackListCheck) {
                injectQueryParamProcess($(this));
            }
        });
    }());

    /**
     * Required with
     * ==========================
     */
    (function () {
        // Required with
        $(document).on('change', '.required-with', function (e, origin) {
            try {
                if (e.originalEvent || origin === "global-init") {
                    var input = $(this);
                    if (input.is(':checkbox') || input.is(':radio')) {
                        var target = input.attr('target') ?? input.attr('data-target');
                        var speedValue = input.attr('speed') ?? input.attr('data-speed') ?? "";
                        var speed = ["fast", "slow"].includes(speedValue) ? speedValue : "slow";

                        // target exists
                        if (target) {
                            // console.log('required-with input changed', [e.originalEvent, input.prop('checked'), input.val()]);
                            const targets = target.replace(new RegExp(' ', 'g'), "").split(',');
                            const closestParentSelector = (input.attr('closest') ?? input.data('closest'));
                            const closestParent = closestParentSelector && `${closestParentSelector}`.length !== 0 ? input.closest(closestParentSelector) : $(document);

                            // checkbox case
                            if (input.is(':checkbox')) {
                                if (input.prop('checked')) {
                                    for (const selector of targets) {
                                        closestParent.find(selector).each(function (index, element) {
                                            $(element).slideDown(speed);
                                        });
                                    }
                                } else {
                                    for (const selector of targets) {
                                        closestParent.find(selector).each(function (index, element) {
                                            $(element).slideUp(speed);
                                        });
                                    }
                                }
                            }
                            // radio case
                            else if (input.is(':radio')) {
                                if (input.prop('checked')) {
                                    // get the radio value
                                    const currentValue = input.val();
                                    const inputName = input.attr('name');

                                    // input name defined
                                    if (inputName) {
                                        closestParent.find(`input[name="${inputName}"]`).each(function (index, element) {
                                            var target = $(element).attr('target') ?? $(element).attr('data-target');
                                            var speedValue = $(element).attr('speed') ?? $(element).attr('data-speed') ?? "";
                                            var speed = ["fast", "slow"].includes(speedValue) ? speedValue : "slow";
                                            /**
                                             * Only for input that has a target dfined
                                             * ------------------------
                                             */
                                            if (target) {
                                                // extract all targets
                                                const targets = target.replace(new RegExp(' ', 'g'), "").split(',');

                                                if ($(element).val() === currentValue) {
                                                    for (const selector of targets) {
                                                        if (!closestParent.find(selector).is(':visible')) {
                                                            closestParent.find(selector).each(function (index, element) {
                                                                $(element).slideDown(speed);
                                                            });
                                                        }
                                                    }
                                                } else {
                                                    for (const selector of targets) {
                                                        if (closestParent.find(selector).is(':visible')) {
                                                            closestParent.find(selector).each(function (index, element) {
                                                                $(element).slideUp(speed);
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                        })
                                    } else {
                                        console.error('`required-with` on `radio` required the input to have the `name` attribute');
                                    }
                                } else {
                                    for (const selector of targets) {
                                        closestParent.find(selector).each(function (index, element) {
                                            $(element).slideUp(speed);
                                        });
                                    }
                                }
                            }

                        }
                    }
                }
            } catch (error) {
                console.error('Error in .required-with handler', error);
            }
        });

        // required with initialized
        $(document).find('.required-with').trigger("change", ["global-init"]);
    })();

    /**
     * Required without
     * ==========================
     */
    (function () {
        // Required without
        $(document).on('change', '.required-without', function (e, origin) {
            if (e.originalEvent || origin === "global-init") {
                if ($(this).is(':checkbox')) {
                    // target attribute name
                    var targetAttr = $(this).data('r-without-target-attr') ?? 'target';
                    // target value
                    var target = $(this).data(targetAttr) ?? $(this).attr('target');

                    if ($(this).prop('checked')) {
                        if (target) {
                            const targets = target.replace(new RegExp(' ', 'g'), "").split(',');
                            for (const selector of targets) {
                                $(document).find(selector).each(function (index, element) {
                                    $(element).slideUp("slow");
                                })
                            }
                        }
                    } else {
                        if (target) {
                            const targets = target.replace(new RegExp(' ', 'g'), "").split(',');
                            for (const selector of targets) {
                                $(document).find(selector).each(function (index, element) {
                                    $(element).slideDown("slow");
                                })
                            }
                        }
                    }
                }
            }
        })

        // required without initialized
        $(document).find('.required-without').trigger("change", ["global-init"]);
    })();

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
                    content: $(`<span>${xhr.responseJSON.message ?? errorMessage ?? "The server encountered a problem while processing the request. Try again later please. Sorry for the inconvenience."}</span>`).text()
                })
            } else {
                $.alert({
                    title: "Error",
                    content: $(`<span>${xhr.responseText ?? errorMessage ?? "The server encountered a problem while processing the request. Try again later please. Sorry for the inconvenience."}</span>`).text()
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
        for (var key in attributes) {
            if (attributes.hasOwnProperty(key)) {
                if (!omits || !omits.includes(key)) {
                    var attrValue = attributes[key];
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
            * Items state
            * @param {string[]|string} list - list of string
            * @returns {[string[], (value) => void, (value) => void, (separator = ',') => string, () => void]}
            **/
            useItems: (list) => {
                var items = !!list ? Array.isArray(list) ? list : list.split(",") : [];

                function addItem(value) {
                    if (!items.find(item => item === value))
                        items.push(value);
                }

                function removeItem(value) {
                    var index = items.indexOf(value);
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
        console.error("Global process error", error)
    }

    /**
     * Load a section content
     * @param {string} sectionSelector - section selector
     * @param {string} urlArr - url attribute
     * @param {string|Array<string>} - refresh button
     * @param {{url?:string; queryParams?: any, beforeStart: () => void|Promise , successCallback: () => void|Promise ,errorCallback: () => void|Promise ,finishCallback: () => void|Promise}|undefined} initialParams initial parameters
     * @returns {params: {queryParams?: any; beforeStart: () => void | Promise; successCallback: () => void | Promise; errorCallback: (xhr: JQuery.jqXHR<any>, status: JQuery.Ajax.ErrorTextStatus, error) => void | Promise; finishCallback: (url: URL, reload: (newUrl) => Promise<void> | void) => void | Promise; } | undefined): JQueryPromise}
     * */
    window.loadContent = (sectionSelector, urlAttr, refreshButtonSelector = ".btn-app-error-refresh", initialParams) => {
        try {
            // refresh buttons
            const refreshButtons = Array.isArray(refreshButtonSelector) ? refreshButtonSelector : (typeof refreshButtonSelector === "string" ? [refreshButtonSelector] : []);
            // console.log('window.loadContent: refresh buttons', refreshButtons);

            // initiate local parameters
            let localParams = initialParams;

            /**
             * Get content url
             * @returns URL
             */
            function getUrl() {
                // section
                let section = $(sectionSelector);

                // initiate url
                const url = new URL(localParams?.url ?? section.attr(urlAttr));
                // inject query parameters
                if (localParams?.queryParams) {
                    for (var key in localParams?.queryParams) {
                        if (localParams?.queryParams.hasOwnProperty(key)) {
                            var keyValue = localParams?.queryParams[key];
                            url.searchParams.set(key, keyValue);
                        }
                    }
                };
                return url;
            }

            /**
             * Load content
             * @param {{url?:string; queryParams?: any, beforeStart: () => void|Promise , successCallback: () => void|Promise ,errorCallback: () => void|Promise ,finishCallback: () => void|Promise}|undefined} params parameters
             * @returns {JQueryPromise<any>}
             **/
            async function load(params) {
                // set local parameters
                localParams = Object.assign(localParams ?? {}, params ?? {});

                // section
                let section = $(sectionSelector);
                // console.log('section.length', section.length);

                // section exists
                if (section.length !== 0) {
                    // get default css
                    let defaultCss = {
                        minHeight: section.css("minHeight"),
                        background: section.css("background"),
                        marginTop: section.css("marginTop"),
                        position: section.css("position")
                    };

                    // set minimum height
                    section.css({ minHeight: "150px", background: "transparent", position: "relative" });

                    try {
                        // show loader
                        section.LoadingOverlay('show');

                        // update refresh button state
                        if (refreshButtons.length !== 0) {
                            $(document).find(refreshButtons.join(',')).prop('disabled', true);
                            $(document).find(refreshButtons.join(',')).find('.fa').addClass("fa-spin");
                        }

                        // applying before start process
                        if (localParams && localParams.beforeStart) {
                            await localParams.beforeStart();
                        }

                        // url
                        const url = getUrl();

                        // fetch data
                        await $.get(url.toString(), async function (data) {
                            // set content
                            section.html(data);

                            // applying success callback process
                            if (localParams && localParams.successCallback) {
                                await localParams.successCallback();
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
                                if (localParams && localParams.errorCallback) {
                                    await localParams.errorCallback(xhr, status, error);
                                }
                            }
                        }).always(async function () {
                            // restore css
                            section.css(defaultCss);

                            // stop loader
                            section.LoadingOverlay('hide');

                            // update refresh button state
                            if (refreshButtons.join(',')) {
                                $(document).find(refreshButtons.join(',')).prop('disabled', false);
                                $(document).find(refreshButtons.join(',')).find('.fa').removeClass("fa-spin");
                            }

                            // applying finish callback process
                            if (localParams && localParams.finishCallback) {
                                await localParams.finishCallback(url, (newUrl) => {
                                    // reload the component
                                    load({
                                        url: newUrl ?? url,
                                        beforeStart: localParams.beforeStart,
                                        errorCallback: localParams.errorCallback,
                                        finishCallback: localParams.finishCallback,
                                        successCallback: localParams.successCallback
                                    });
                                });
                            }
                        });
                    } catch (error) {
                        console.error("loadContent error", [localParams.url ?? section.attr(urlAttr), error])
                    }
                } else {
                    return (localParams) => { console.log('You are calling a void negger!'); };
                }
            }

            // off the previous listener
            $(document)
                // .find(sectionSelector)
                .off("click", refreshButtons.join(','));

            // listen to refresh buton
            $(document)
                // .find(sectionSelector)
                .on('click', refreshButtons.join(','), function (event) {
                    event.preventDefault();
                    // console.log('refreshing...', $(this).attr("class"), localParams?.successCallback);
                    // url
                    const url = getUrl();
                    // reload the component
                    load({
                        url: $(this).attr('href') ?? url.toString(),
                        beforeStart: localParams?.beforeStart,
                        errorCallback: localParams?.errorCallback,
                        finishCallback: localParams?.finishCallback,
                        successCallback: localParams?.successCallback,
                    });
                });

            // load
            return load;

        } catch (error) {
            console.log('window.loadContent > error', error);
            return () => {
                console.error("You are calling the void")
            }
        }
    };

    /**
    * Load a section content on click
    * @param {string} containerSelector - section selector
    * @param {string} urlArr - url attribute
    * @param {string|Array<string>} triggerSelector - triggerSelector attribute
    * @returns {params: {queryParams?: any; beforeStart: () => void | Promise; successCallback: () => void | Promise; errorCallback: (xhr: JQuery.jqXHR<any>, status: JQuery.Ajax.ErrorTextStatus, error) => void | Promise; finishCallback: (url: URL, reload: (newUrl) => Promise<void> | void) => void | Promise; } | undefined): JQueryPromise}
    * */
    window.loadContentOnClick = (containerSelector, urlAttr, triggerSelector) => {
        try {
            /**
             * Load content
             * @param {{url?:string; queryParams?: any, beforeStart: () => void|Promise , successCallback: () => void|Promise ,errorCallback: () => void|Promise ,finishCallback: () => void|Promise}|undefined} params parameters
             * @returns {JQueryPromise<any>}
             **/
            async function load(params) {
                // section
                let section = $(containerSelector);

                // section exists
                if (section.length !== 0) {
                    // get default css
                    let defaultCss = {
                        minHeight: section.css("minHeight"),
                        background: section.css("background"),
                        marginTop: section.css("marginTop"),
                        position: section.css("position")
                    };

                    // set minimum height
                    section.css({ minHeight: "150px", background: "transparent", position: "relative" });

                    // listen to triggerer
                    $(document).on("click", Array.isArray(triggerSelector) ? triggerSelector.join(',') : triggerSelector, async function (e) {
                        e.preventDefault();

                        // url
                        let url = new URL(params.url ?? $(this).attr(urlAttr));

                        // inject query params
                        if (params.queryParams) {
                            for (var key in params.queryParams) {
                                if (params.queryParams.hasOwnProperty(key)) {
                                    var keyValue = params.queryParams[key];
                                    url.searchParams.set(key, keyValue);
                                }
                            }
                        }

                        try {
                            // show loader
                            section.LoadingOverlay('show');

                            // // update refresh button state
                            // if (refreshButtonSelector) {
                            //     $(document).find(refreshButtonSelector).prop('disabled', true);
                            //     $(document).find(refreshButtonSelector).find('.fa').addClass("fa-spin");
                            // }

                            // applying before start process
                            if (params && params.beforeStart) {
                                await params.beforeStart();
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

                                // // update refresh button state
                                // if (refreshButtonSelector) {
                                //     $(document).find(refreshButtonSelector).prop('disabled', false);
                                //     $(document).find(refreshButtonSelector).find('.fa').removeClass("fa-spin");
                                // }

                                // applying finish callback process
                                if (params && params.finishCallback) {
                                    await params.finishCallback(url, (newUrl) => {
                                        // reload the component
                                        load({
                                            url: newUrl ?? url,
                                            beforeStart: params.beforeStart,
                                            errorCallback: params.errorCallback,
                                            finishCallback: params.finishCallback,
                                            successCallback: params.successCallback
                                        });
                                    });
                                }

                                // // off the previous listener
                                // $(document).find(containerSelector).off("click", refreshButtonSelector)

                                // // listen to refresh buton
                                // $(document).find(containerSelector).on('click', refreshButtonSelector, function (event) {
                                //     event.preventDefault();

                                //     // reload the component
                                //     load({
                                //         url: $(this).attr('href') ?? url.toString(),
                                //         beforeStart: params.beforeStart,
                                //         errorCallback: params.errorCallback,
                                //         finishCallback: params.finishCallback,
                                //         successCallback: params.successCallback
                                //     });

                                //     // console.log($(this))
                                // })
                            });
                        } catch (error) {
                            console.error("loadContent > load error", [params.url ?? section.attr(urlAttr), error]);
                        }
                    });
                }
            }
            return load;
        } catch (e) {
            console.error("loadContent error", [params.url ?? section.attr(urlAttr), error])
            return () => { };
        }
    };

    /**
    * Open a remote modal
    * @param {{loaderContainerSelector:string; modalId: string;onLoad: () => void|Promise<void>; beforeOpen?: (triggerer: JQuery) => boolean|Promise<boolean>; onCloseMethod: () => void|Promise<void>; errorCallback: (xhr:JQuery.jqXHR<any>, status:JQuery.Ajax.ErrorTextStatus, error:string) => void|Promise<void>;event: string;triggerSelector: string; refreshButton: string;hrefParser?: (url:string, target:JQuery) => string|Promise<string>;}} params modal setup modal
    * @returns {[() => void, () => void]}
    * */
    window.setupModal = (params) => {
        /**
         * load modal content
         * @param {JQuery} btn - modal instance
         * */
        const load = async (btn) => {
            // start loading
            $(params.loaderContainerSelector).LoadingOverlay('show');

            try {
                //real href
                const realHref = params.hrefParser ? params.hrefParser(btn.data('href') ?? btn.attr('href'), btn) : btn.data('href') ?? btn.attr('href');

                // fetch content
                await $.get(realHref ?? btn.attr('href')).done(async function (data) {
                    $(document).find(params.modalId).find('.modal-content').html(data);

                    try {
                        // onLoad callback
                        if (params.onLoad) {
                            await params.onLoad(btn);
                        }

                    } catch (error) {
                        console.error('JFK >> setupModal > Faile to run onLoad script', [error, params.onLoad])
                    }

                    /**
                     * Refresh the page when the modal is closed
                     */
                    $(document).find(params.modalId).off('hidden.bs.modal'); // off the previous handler if exist
                    $(document).find(params.modalId).on('hidden.bs.modal', async function (e) {
                        // empty the content
                        // very important
                        // has been causing me a lot of trouble
                        $(document).find(params.modalId).find('.modal-content').empty();

                        if (params.onCloseMethod) {
                            await params.onCloseMethod(btn);
                        }
                    })

                    /**
                     * Display the modal
                     */
                    if (window.bootstrap?.Modal?.getOrCreateInstance) {
                        const modalEl = document.querySelector(params.modalId);
                        const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl, {
                            keyboard: false,
                            backdrop: 'static',
                            focus: true
                        });
                        
                        modalInstance.show();
                    } else {
                        $(document).find(params.modalId).modal({
                            show: true,
                            backdrop: 'static',
                            keyboard: true
                        });
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
                            await params.errorCallback(xhr, status, error, btn);
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

        try {
            // listen to modal opening
            $(document).off(params.event, params.triggerSelector);
            $(document).on(params.event, params.triggerSelector, async function (e) {
                e.stopPropagation();
                e.preventDefault();
                console.log("setup modal > btn clicked", params.triggerSelector)
                // triggerer
                var triggerer = $(this);

                // can continue
                let goNext = true;

                if (typeof params.beforeOpen !== "undefined") {
                    goNext = await params.beforeOpen(triggerer);
                }

                // if the trigger is allowed (go next)
                if (goNext) {
                    // load content
                    load(triggerer);

                    // Refresh button
                    if (params.refreshButton) {
                        // off the previous listener
                        $(document).find(params.modalId).off("click", params.refreshButton)

                        // listen to refresh buton
                        $(document).find(params.modalId).on('click', params.refreshButton, function (e) {
                            e.stopPropagation();
                            e.preventDefault();
                            // reload the component
                            load(($(this).data('href') ?? $(this).attr('href')) ? $(this) : triggerer);
                        })
                    }
                }
            })

        } catch (error) {
            console.error("setupModal error", error)
        }
        return [load, offEvent];
    };

    /**
     * Define a form modal
     * @param {{modalId:string; openBtn: string; hrefParser?: (url:string, target: JQuery) => string|Promise<string>; openLoadingContainer?:string; refreshBtn?: string; beforeOpen?: (trigger: JQuery) => boolean|Promise<boolean>; onOpen?: (btn: JQuery) => void|Promise<void>; onClose?: (btn: JQuery) => void|Promise<void>; errorMessage?: string; successMessage?:string; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parameters
     */
    window.defineDetailsModal = (options) => {
        // defaults options
        const params = $.extend(true, {
            openLoadingContainer: 'body',
        }, options);

        // setup edition modal
        return setupModal({
            event: 'click',
            triggerSelector: params.openBtn,
            modalId: params.modalId,
            loaderContainerSelector: params.openLoadingContainer,
            hrefParser: params.hrefParser,
            refreshButton: params.refreshBtn,
            beforeOpen: params.beforeOpen,
            onLoad: params.onOpen,
            onCloseMethod: params.onClose
        });
    };

    /**
     * Define a form modal
     * @param {{modalId:string; openBtn: string; hrefParser?: (url:string, target: JQuery) => string|Promise<string>; form: string; method?: string; resetOnSuccess?: boolean; openLoadingContainer?:string; submitLoadingContainer?:string; refreshBtn?: string; onOpen?: (btn: JQuery) => void|Promise<void>; onClose?: (btn: JQuery) => void|Promise<void>; formActionParser?: (url:string) => string|Promise<string>; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parameters
     */
    window.defineFormModal = function (options) {
        // defaults options
        const params = $.extend(true, {
            resetOnSuccess: false,
            openLoadingContainer: 'body',
            method: 'post'
        }, options);

        try {
            // cancel previous listener
            $(document).find(params.modalId).off("submit", params.form);

            // add new listener
            $(document).find(params.modalId).on("submit", params.form, function (e) {
                e.preventDefault();

                // get form element
                var formElement = $(this).get()[0];

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
                                content: $(`<span>${params.successMessage ?? xhr.responseJSON.message ?? 'the operation was successful.'}</span>`).text()
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
                                content: $(`<span>${params.errorMessage ?? jqXhr.responseJSON.message ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text()
                            })
                        } else {
                            $.alert({
                                title: 'Operation failed',
                                type: 'red',
                                content: $(`<span>${params.errorMessage ?? jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text()
                            })
                        }

                        // fail callback
                        if (params.onFail) {
                            params.onFail(jqXhr);
                        }
                    },
                    complete: function () {
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
            setupModal({
                event: 'click',
                triggerSelector: params.openBtn,
                modalId: params.modalId,
                loaderContainerSelector: params.openLoadingContainer,
                hrefParser: params.hrefParser,
                refreshButton: params.refreshBtn,
                onLoad: params.onOpen,
                onCloseMethod: params.onClose
            });

        } catch (error) {
            console.error('defineFormModal error', error)
        }
    }

    /**
     * Define a form
     * @param {{
     * urlAttr: string;
     * containerId:string; 
     * form: string; 
     * method?: string; 
     * resetOnSuccess?: boolean; 
     * openLoadingContainer?:string; 
     * submitLoadingContainer?:string; 
     * refreshBtn?: string; 
     * onOpen?: (btn: JQuery) => void|Promise<void>; 
     * onClose?: (btn: JQuery) => void|Promise<void>; 
     * formActionParser?: (url:string) => string|Promise<string>; 
     * errorMessage?: string;
     *  successMessage?:string; 
     * onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; 
     * onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;
     * }} options parameters
     */
    window.defineForm = function (options) {
        // defaults options
        const params = $.extend(true, {
            resetOnSuccess: false,
            openLoadingContainer: 'body',
            method: 'post'
        }, options);

        try {
            // cancel previous listener
            $(document).find(params.containerId).off("submit", params.form);

            // add new listener
            $(document).find(params.containerId).on("submit", params.form, function (e) {
                e.preventDefault();

                // get form element
                var formElement = $(this).get()[0];

                // set form data
                let formData = new FormData(formElement)

                // start loading
                if (params.submitLoadingContainer) {
                    $(params.submitLoadingContainer).LoadingOverlay("show");
                } else {
                    $(params.containerId).LoadingOverlay("show");
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
                                content: $(`<span>${params.successMessage ?? xhr.responseJSON.message ?? 'the operation was successful.'}</span>`).text()
                            })
                        } else {
                            // replace the current content
                            $(document).find(params.containerId).html(data);
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
                                content: $(`<span>${params.errorMessage ?? jqXhr.responseJSON.message ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text()
                            })
                        } else {
                            $.alert({
                                title: 'Operation failed',
                                type: 'red',
                                content: $(`<span>${params.errorMessage ?? jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text()
                            })
                        }

                        // fail callback
                        if (params.onFail) {
                            params.onFail(jqXhr);
                        }
                    },
                    complete: function () {
                        // stop loading
                        if (params.submitLoadingContainer) {
                            $(params.submitLoadingContainer).LoadingOverlay("hide");
                        } else {
                            $(params.containerId).LoadingOverlay("hide");
                        }
                    }
                });
            });

            // setup edition modal
            return window.loadContent(params.containerId, params.urlAttr, params.refreshBtn, {
                successCallback: params.onOpen
            });
        } catch (error) {
            console.error('defineForm error', error)
        }
    }

    /**
     * Define action dialog for resource
     * @param {{customMessage?:string; customMessageAttr?:string; containerSelector?:string; checkboxItemSelector?:string; resourceIdArr?:string; actionBtnIdAttr?:string; actionBtn: string; action: string; resourceLabelAttr?:string; resourceUrlAttr?:string; resourceText?:string; method:string; errorMessage?: string; customErrorMessage?:string; customErrorMessageAttr?:string; successMessage?:string; customSuccessMessage?:string; customSuccessMessageAttr?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parameters
     */
    window.elementActionConfirm = function (options) {
        // defaults options
        const params = $.extend(true, {
            actionBtnIdAttr: 'data-id',
            resourceIdArr: 'id',
            resourceLabelAttr: 'data-name',
            customMessageAttr: "data-custom-message",
            customSuccessMessageAttr: "data-custom-success-message",
            customErrorMessageAttr: "data-custom-error-message",
            resourceUrlAttr: "href",
            resourceText: "resource"
        }, options);

        $(document).off('click', params.actionBtn);
        $(document).on('click', params.actionBtn, function (e) {
            e.stopPropagation();
            e.preventDefault();

            let self = $(this);

            // resource label
            let resourceLabel = undefined

            // load data name
            if (params.containerSelector && params.checkboxItemSelector) {
                resourceLabel = $(document).find(params.containerSelector)
                    .find(`${params.checkboxItemSelector}`)
                    .find(`[${params.resourceIdArr}="${self.attr(params.actionBtnIdAttr)}"]`)
                    .attr(params.resourceLabelAttr);
            }

            // extract messages
            let customMessage = params.customMessage ?? self.attr(params.customMessageAttr);
            let customSuccessMessage = params.customSuccessMessage ?? self.attr(params.customSuccessMessageAttr);
            let customErrorMessage = params.customErrorMessage ?? self.attr(params.customErrorMessageAttr);


            let confirm = $.confirm({
                type: 'dark',
                title: 'Confirmation',
                content: $(`<span>${customMessage ?? `Do you really want to ${params.action} the ${params.resourceText}${resourceLabel ? ` <strong>${resourceLabel}</strong>` : ''}`}</span>`).text(),
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
                                            content: $(`<span>${customSuccessMessage ?? xhr.responseJSON.message ?? "The request was executed successfully"}</span>`).text(),
                                            onClose: function () {
                                                // success callback
                                                if (params.onSuccess) {
                                                    params.onSuccess(data, status, xhr, self);
                                                }
                                            }
                                        });
                                    } else {
                                        $.alert({
                                            icon: 'fa fa-check text-success',
                                            title: "Success",
                                            type: "green",
                                            content: $(`<span>${customSuccessMessage ?? xhr.responseText ?? "The request was executed successfully"}</span`).text(),
                                            onClose: function () {
                                                // success callback
                                                if (params.onSuccess) {
                                                    params.onSuccess(data, status, xhr, self);
                                                }
                                            }
                                        });
                                    }
                                },
                                error: (jqXhr) => {
                                    if (jqXhr.responseJSON) {
                                        $.alert({
                                            title: `Failed to ${params.action} the ${params.resourceText}`,
                                            type: 'red',
                                            content: $(`<span>${customErrorMessage ?? jqXhr.responseJSON?.message ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text(),
                                            onClose: function () {
                                                // fail callback
                                                if (params.onFail) {
                                                    params.onFail(jqXhr, self);
                                                }
                                            }
                                        })
                                    } else {
                                        $.alert({
                                            title: `Failed to ${params.action} the ${params.resourceText}`,
                                            content: $(`<span>${customErrorMessage ?? jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text(),
                                            onClose: function () {
                                                // fail callback
                                                if (params.onFail) {
                                                    params.onFail(jqXhr, self);
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
     * Define remote confirm dialog
     * @param {{actionBtn: string; customMessage?:string; skipConfirm: boolean; customMessageAttr?:string; type?: "delete"|"restore"; resourceLabelAttr?:string; resourceUrlAttr?:string; method?:string; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parametrs
     */
    window.remoteConfirmDialog = (options) => {
        // defaults options
        let params = $.extend(true, {
            resourceLabelAttr: 'data-name',
            customMessageAttr: "data-custom-message",
            resourceUrlAttr: "href",
            method: 'delete',
            type: "delete",
            skipConfirm: false
        }, options);

        $(document).off('click', params.actionBtn);
        $(document).on('click', params.actionBtn, function (e) {
            e.stopPropagation();
            e.preventDefault();

            let self = $(this);

            // extract custom message
            let customMessage = params.customMessage ?? self.attr(params.customMessageAttr);

            /**
             * Make the call
             */
            const makeTheCall = (confirmInstance) => {
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
                                content: $(`<span>${params.successMessage ?? xhr.responseJSON.message ?? "The request was executed successfully"}</span>`).text(),
                                onClose: function () {
                                    // success callback
                                    if (params.onSuccess) {
                                        params.onSuccess(data, status, xhr, self);
                                    }
                                }
                            });
                        } else {
                            $.alert({
                                icon: 'fa fa-check text-success',
                                title: "Success",
                                type: "green",
                                content: $(`<span>${params.successMessage ?? xhr.responseText ?? "The request was executed successfully"}</span>`).text(),
                                onClose: function () {
                                    // success callback
                                    if (params.onSuccess) {
                                        params.onSuccess(data, status, xhr, self);
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
                                content: $(`<span>${params.errorMessage ?? jqXhr.responseJSON.message ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text(),
                                onClose: function () {
                                    // fail callback
                                    if (params.onFail) {
                                        params.onFail(jqXhr, self);
                                    }
                                }
                            })
                        } else {
                            $.alert({
                                title: `Failed to ${params.type} the resource`,
                                content: $(`<span>${params.errorMessage ?? jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.'}</span>`).text(),
                                onClose: function () {
                                    // fail callback
                                    if (params.onFail) {
                                        params.onFail(jqXhr, self);
                                    }
                                }
                            })
                        }
                    },
                    complete: () => {
                        if (confirmInstance) {
                            try {
                                confirmInstance.hideLoading(true);
                                confirmInstance.close();
                            } catch (closingErr) {
                                console.log('makeTheCall error', closingErr);
                            }
                        }
                    }
                });
            }

            if (params.skipConfirm) {
                makeTheCall();
            } else {
                let confirm = $.confirm({
                    type: 'dark',
                    title: 'Confirmation',
                    content: $(`<span>${customMessage ?? `Do you really want to ${params.type} the resource "<strong>${self.attr(params.resourceLabelAttr)}</strong>"`}</span>`).text(),
                    buttons: {
                        yes: {
                            text: 'Yes',
                            action: function () {
                                confirm.showLoading(true);

                                makeTheCall(confirm);

                                return false;
                            }
                        },
                        no: function () {
                        }
                    }
                });
            }
        });
    }

    /**
     * Define delete dialog for resource deletion
     * @param {{actionBtn: string; customMessage?:string; customMessageAttr?:string; type?: "delete"|"restore"; resourceLabelAttr?:string; resourceUrlAttr?:string; method?:string; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>;}} options parametrs
     */
    window.defineDeleteOrRestoreDialog = window.remoteConfirmDialog;

    /**
     * Define grouped action with confirmation dialog
     * @param {{container?: string; actionBtn: string; action: string; processingText: string; checkboxItem: string; nameKey?:string; urlParam?: string; urlAttr?: string; method?:string; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>; onComplete: () => void|Promise<void>; onCancel: () => void|Promise<void>;}} options parameters
     */
    window.groupedItemActionConfirm = function (options) {

        // defaults options
        var params = $.extend(true, {
            container: 'body',
            localItemsKey: 'local-items',
            processingText: "processing",
            nameKey: 'name',
            urlAttr: 'href',
            urlParam: ':id'
        }, options);

        /**
         * Listen to qction
         */
        $(document).off("click", `${params.container} ${params.actionBtn}`);
        $(document).on("click", `${params.container} ${params.actionBtn}`, function (event) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            try {
                // button
                var self = $(this);

                /**
                 * @type {Array<{name: string; url: string;}>} resources list
                 */
                var resources = [];

                /**
                 * @type {string[]} resource IDs
                 */
                let data = self.data(params.localItemsKey);

                if (!Array.isArray(data)) {
                    data = [data];
                }

                for (var id of data) {
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
                        content: $(`<span>${`Do you really want to ${params.action} ${resources.length > 1 ? `the ${resources.length} seleted elements` : 'the selected element'}?`}</span>`).text(),
                        buttons: {
                            confirm: function () {
                                $.alert({
                                    type: 'dark',
                                    title: `<div><i class="fa fa-refresh fa-spin"></i> ${params.processingText}...</div>`,
                                    content: `<div style="font-size: 14px;">
                                <div><span class="success-count" style="color: green; margin-right: 5px;">0</span> successful</div>
                                <div><span class="fail-count" style="color: red; margin-right: 5px;">0</span> failed</div>
                            </div>`,
                                    onContentReady: function () {
                                        var self = this;
                                        // counters
                                        let success = 0;
                                        let errorCount = 0;

                                        var promise = new Promise(async (resolve, reject) => {
                                            // hide ok button
                                            this.$$ok.hide();

                                            // delete items
                                            for (let index = 0; index < resources.length; index++) {
                                                var resource = resources[index];

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
                                                                    content: $(`<span style="font-size: 14px;">${params.errorMessage ?? error.responseJSON.message ?? `Failed to delete the resource <strong>${resource.name}`}</span>`).text()
                                                                })
                                                            } else {
                                                                $.alert({
                                                                    type: 'red',
                                                                    title: `Operation failed`,
                                                                    content: $(`<span style="font-size: 14px;">${params.errorMessage ?? error.responseText ?? `Failed to delete the resource <strong>${resource.name}`}</span>`).text()
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
                                                        content: $(`<span style="font-size: 14px;">${params.errorMessage ?? e.message ?? "Something went wrong while processing your request. Try again later, please."}</span>`).text()
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
            } catch (error) {
                console.error("JQuery Frontend Kit: groupedItemActionConfirm error", error);
            }
        });
    }

    /**
     * Define delete or restore items dialog
     * @param {{container?: string; actionBtn: string; type?: "delete"|"restore"; checkboxItem: string; nameKey?:string; urlParam?: string; urlAttr?: string; method?:string; errorMessage?: string; successMessage?:string; onSuccess?: (data: any, status: JQuery<TElement = HTMLElement>.Ajax.SuccessTextStatus, xhr: JQuery.jqXHR<any>) => void|Promise<void>; onFail?: (jqXhr: JQuery.jqXHR<any>) => void|Promise<void>; onComplete: () => void|Promise<void>; onCancel: () => void|Promise<void>;}} options parameters
     */
    window.defineGroupDeleteOrRestoreDialog = function (options) {

        // defaults options
        var params = $.extend(true, {
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
            event.stopImmediatePropagation();
            event.stopPropagation();

            // button
            var self = $(this);

            /**
             * @type {Array<{name: string; url: string;}>} resources list
             */
            var resources = [];

            /**
             * @type {string[]} resource IDs
             */
            let data = self.data(params.localItemsKey);

            if (!Array.isArray(data)) {
                data = [data];
            }

            for (var id of data) {
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
                    content: $(`<span>${`Do you really want to ${params.type} ${resources.length > 1 ? `the ${resources.length} seleted elements` : 'the selected element'}?`}</span>`).text(),
                    buttons: {
                        confirm: function () {
                            var loadingText = '';
                            switch (params.type) {
                                case 'restore':
                                    loadingText = 'Restoring';
                                    break;

                                case 'delete':
                                    loadingText = 'Deleting';
                                    break;

                                case 'cancel':
                                    loadingText = 'Cancelling';
                                    break;

                                default:
                                    loadingText = 'Loading'
                                    break;
                            }

                            $.alert({
                                type: 'dark',
                                title: `<div><i class="fa fa-refresh fa-spin"></i> ${loadingText}...</div>`,
                                content: `<div style="font-size: 14px;">
                                <div><span class="success-count" style="color: green; margin-right: 5px;">0</span> successful</div>
                                <div><span class="fail-count" style="color: red; margin-right: 5px;">0</span> failed</div>
                            </div>`,
                                onContentReady: function () {
                                    var self = this;
                                    // counters
                                    let success = 0;
                                    let errorCount = 0;

                                    var promise = new Promise(async (resolve, reject) => {
                                        // hide ok button
                                        this.$$ok.hide();

                                        // delete items
                                        for (let index = 0; index < resources.length; index++) {
                                            var resource = resources[index];

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
                                                                content: $(`<span style="font-size: 14px;">${params.errorMessage ?? error.responseJSON.message ?? `Failed to delete the resource <strong>${resource.name}`}</span>`).text()
                                                            })
                                                        } else {
                                                            $.alert({
                                                                type: 'red',
                                                                title: `Operation failed`,
                                                                content: $(`<span style="font-size: 14px;">${params.errorMessage ?? error.responseText ?? `Failed to delete the resource <strong>${resource.name}`}</span>`).text()
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
                                                    content: $(`<span style="font-size: 14px;">${params.errorMessage ?? e.message ?? "Something went wrong while processing your request. Try again later, please."}</span>`).text()
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
     * @param {{optionGroupAttr?:string; readOnly: boolean; placeholder: string;ignorePlaceholder:boolean; itemsSelectedAttr:string; urlAttr:string; defaultValueAttr: string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} options options
     */
    $.fn.remoteSelect = function (options) {
        /**
         * @param {{slimOptions: any; initiated: (instance: any) => Promise<void>|void; readOnly: boolean; placeholder: string;ignorePlaceholder:boolean; itemsSelectedAttr:string; urlAttr:string; defaultValueAttr:string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} settings options
         */
        var settings = $.extend(true, {
            slimOptions: {},
            readOnly: false,
            urlAttr: 'href',
            defaultValueAttr: 'value',
            ignorePlaceholder: false,
            itemsSelectedAttr: 'data-items-selected',
            optionGroupAttr: 'data-children',
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
                        // remove previous options
                        $(input).find("option").remove();
                        // at least one result
                        if (data.length !== 0) {
                            // default value
                            let defaultValue = `${$(input).attr(settings.defaultValueAttr) ?? $(input).data(settings.defaultValueAttr) ?? ''}`.split(',');

                            function nativeRender() {
                                // add default option
                                if (!settings.ignorePlaceholder) {
                                    $(input).prepend($(`<option value="" data-placeholder="true">${settings.placeholder ?? $(input).attr("aria-placeholder") ?? "-- select an item --"}</option>`));
                                }

                                /**
                                 * Render select items
                                 * @param {Array<any>} list items list
                                 */
                                function renderItems(list) {
                                    // add new options
                                    for (var item of list) {
                                        // render option data
                                        const option = settings.renderItem(item);
                                        // children attr
                                        const childrenAttr = $(input).attr(settings.optionGroupAttr);
                                        // children attribute defined
                                        if (childrenAttr && Array.isArray(item[childrenAttr]) && item[childrenAttr].length !== 0) {
                                            // render the option
                                            $(input).append($(`<optgroup label="${option.label}">`));

                                            // render items
                                            renderItems(item[childrenAttr]);

                                            // render the option
                                            $(input).append($(`</optgroup>`));
                                        } else {
                                            // render the option
                                            $(input).append($(`<option${($(input).is(`[${settings.itemsSelectedAttr}]`) || defaultValue.includes(`${option.value}`)) ? ' selected' : ''} value="${option.value}"${objectToHtmlAttributes(settings.renderAttributes(item), ['value'])}>${option.label}</option>`));
                                        }
                                    }
                                }

                                // render items
                                renderItems(data);

                                // no data found
                                if (Array.isArray(data) && data.length === 0) {
                                    $(input).append($(`<option value="">-- No items found --</option>`));
                                }

                                // new slim select instance
                                const instance = new SlimSelect({
                                    select: $(input).get(0),
                                    showSearch: true,
                                    searchHighlight: true,
                                    allowDeselect: true,
                                    hideSelectedOption: true,
                                    ...settings.slimOptions
                                });

                                // initiated callback
                                if (settings.initiated) {
                                    settings.initiated(instance);
                                }
                            }

                            nativeRender();
                        }

                    }).fail(async (xhr) => {
                        displayError(xhr);
                    }).always(function () {
                        // toggle loading
                        $(input).removeClass("ui-autocomplete-loading");
                        // disable input
                        // $(input).prop("disabled", settings.readOnly ?? false);
                    });
                } catch (e) {
                    // toggle loading
                    $(input).removeClass("ui-autocomplete-loading");
                }
            } else {
                console.error("remoteSelect function can only be apply on select input");
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
        var settings = $.extend(true, {
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
                        var defaultValues = ($(section).attr(settings.defaultValueAttr) ?? '').split(',');
                        // add new options
                        for (var item of data) {
                            // render option data
                            var option = settings.renderItem(item);
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
     * @param {{readOnly:boolean; hiddenInputSelector?:string; urlAttr:string; onSelect?: (value:any) => Promise<void>; defaultValueAttr?:string; appendTo?:string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} options options
     */
    $.fn.remoteAutocomplete = function (options) {
        /**
         * @param {{mode: 'text'|'select';readOnly:boolean; hiddenInputSelector?:string; urlAttr:string; onSelect?: (value:any) => Promise<void>; defaultValueAttr?:string; appendTo?:string;renderSuggestion: (list, item) => void; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} settings options
         */
        var settings = $.extend(true, {
            mode: 'text',
            readOnly: false,
            urlAttr: 'href',
            defaultValueAttr: 'data-value',
            renderSuggestion: undefined,
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
            // log
            // console.log('remoteAutocomplete initiation triggered');
            // checking if the selected element is an input
            if ($(input).is("input:text")) {
                // setting the value in the hidden input
                var setHiddenInputValue = (value) => {
                    if (settings.hiddenInputSelector) {
                        var hiddenInput = $(input).closest('form').find(settings.hiddenInputSelector);
                        // set the default value
                        hiddenInput.val(value);
                    }
                }

                // json
                try {
                    // update input state
                    $(input).prop('disabled', settings.readOnly);

                    // load default value
                    const defaultValue = $(input).attr(settings.defaultValueAttr) ?? '';

                    // set the default value
                    setHiddenInputValue(defaultValue);

                    // destroy previous
                    if ($(input).autocomplete("instance")) {
                        $(input).autocomplete("destroy");
                    }

                    // destroying previous if exists
                    try {
                        if ($(input).data('autocomplete')) {
                            $(input).autocomplete("destroy");
                            $(input).removeData('autocomplete');
                        }
                    } catch (acDestroyError) {

                    }

                    // defining autocomplete
                    const autocompleteInstance = $(input).autocomplete({
                        minLength: settings.mode === 'select' ? 0 : 2,
                        appendTo: settings.appendTo,
                        source: function (request, response) {
                            // term
                            var term = request.term;

                            // building request URL
                            var url = new URL($(input).attr(settings.urlAttr));
                            url.searchParams.set('term', term);

                            // set the initial value
                            if (defaultValue) {
                                url.searchParams.set('initial', defaultValue);
                            }

                            // fetch data
                            $.getJSON(url.toString(), request, function (data, status, xhr) {
                                // render options
                                var options = data.map((item) => {
                                    var option = { ...settings.renderItem(item), origin: item };
                                    return option;
                                });
                                // set data
                                response(options);
                            });
                        },
                        select: function (_event, ui) {
                            // call callback if exists
                            if (settings.onSelect) {
                                settings.onSelect(ui.item.value, ui.item);
                            }
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

                    /**
                     * Render suggestion
                     */
                    if (settings.renderSuggestion) {
                        autocompleteInstance.autocomplete("instance")._renderItem = function (ul, item) {
                            return settings.renderSuggestion(ul, item);
                        }
                    }

                    // select mode
                    if (settings.mode === 'select') {
                        // console.log('triggering change');
                        $(input).trigger('change');
                    }
                } catch (e) {
                    console.error('remoteAutocomplete', e);
                }
            } else {
                console.error("remoteAutocomplete function can only be apply on text input");
            }
        });
    };

    /**
     * Load autocomplete with remote data
     * @param {{readOnly:boolean; hiddenInputSelector?:string; urlAttr:string; onSelect?: (value:any) => Promise<void>; defaultValueAttr?:string; appendTo?:string; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} options options
     */
    $.fn.slimRemoteAutocomplete = function (options) {
        /**
         * @param {{readOnly:boolean; hiddenInputSelector?:string; urlAttr:string; onSelect?: (value:any) => Promise<void>; defaultValueAttr?:string; appendTo?:string;renderSuggestion: (list, item) => void; renderItem: (data:any) => {value:string|number; label:string;};renderAttributes:(data:any) => any;}} settings options
         */
        var settings = $.extend(true, {
            readOnly: false,
            urlAttr: 'href',
            defaultValueAttr: 'data-value',
            renderSuggestion: undefined,
            renderItem: function (data) {
                return {
                    value: data?.value ?? data,
                    text: data?.text ?? data
                }
            },
            renderAttributes: function (data) {
                return {};
            }
        }, options);

        return this.each(async function (index, elt) {
            const input = $(elt);
            // log
            // console.log('slimRemoteAutocomplete initiation triggered');
            // checking if the selected element is an input
            if (!input.attr('id')) {
                console.error('slimRemoteAutocomplete require the select input to have an `id` attribute')
            } else if (input.is("select")) {
                // json
                try {
                    // setting the value in the hidden input
                    var setHiddenInputValue = (value) => {
                        if (settings.hiddenInputSelector) {
                            var hiddenInput = input.closest('form').find(settings.hiddenInputSelector);
                            // console.log("setHiddenInputValue", [settings.hiddenInputSelector, value, hiddenInput.length, hiddenInput])
                            // set the default value
                            hiddenInput.val(value);
                        }
                    }

                    // destroying previous if exists
                    try {
                        // destroy previous
                        if (input.get(0).slim) {
                            input.get(0).slim.destroy();
                        }
                    } catch (acDestroyError) {
                        console.error('Failed to destroy previous slim select instance', [input.get(0).slim, acDestroyError]);
                    }

                    // default options
                    const defaultOptions = [];

                    // toggle loading
                    input.addClass("ui-autocomplete-loading");

                    // construct url
                    var initialUrl = new URL(input.attr(settings.urlAttr))
                    // fetch initial data
                    await $.getJSON(initialUrl.toString(), function (data, status, xhr) {
                        // render options
                        var options = data.map((item) => {
                            var option = { ...settings.renderItem(item), origin: item };
                            return option;
                        });
                        // set default options
                        defaultOptions.push(...options);
                    }).catch(function (error) {
                        console.error("slimRemoteAutocomplete: failed to load initial data", error);
                    }).always(() => {
                        // toggle loading
                        input.removeClass("ui-autocomplete-loading");
                    });

                    // initialize select
                    const autocompleteSelect = new SlimSelect({
                        select: `#${input.attr('id')}`,
                        searchingText: 'Searching...', // Optional - Will show during ajax request
                        data: defaultOptions,
                        onChange: (info) => {
                            setHiddenInputValue(info.value);
                        }
                        // ajax: function (search, callback) {
                        //     // clear selected
                        //     console.log("autocompleteSelect.values()", !autocompleteSelect.selected());
                        //     // if (autocompleteSelect.selected() !== null && autocompleteSelect.selected() !== undefined) {
                        //     //     autocompleteSelect.set(null);
                        //     // }
                        //     // Check search value. If you dont like it callback(false) or callback('Message String')
                        //     // if (search.length < 2) {
                        //     //     callback('Need 3 characters')
                        //     //     return
                        //     // }

                        //     // building request URL
                        //     var url = new URL(input.attr(settings.urlAttr));
                        //     url.searchParams.set('term', search);

                        //     // Perform your own ajax request here
                        //     // fetch data
                        //     $.getJSON(url.toString(), function (data, status, xhr) {
                        //         // render options
                        //         var options = data.map((item) => {
                        //             var option = { ...settings.renderItem(item), origin: item };
                        //             return option;
                        //         });
                        //         autocompleteSelect.set(null);
                        //         // set data
                        //         callback(options);
                        //     }).catch(function (error) {
                        //         // If any erros happened send false back through the callback
                        //         callback(false)
                        //     });
                        // }
                    });

                    console.log('autocompleteSelect', autocompleteSelect);

                    // load default value
                    const defaultValue = input.attr(settings.defaultValueAttr) ?? '';

                    setHiddenInputValue(defaultValue);

                    // set the default value
                    autocompleteSelect.set(defaultValue);

                    // read only mode
                    if (settings.readOnly === true) {
                        autocompleteSelect.disable();
                    }

                } catch (e) {
                    console.error('slimRemoteAutocomplete', [`#${input.attr('id')}`, e]);
                }
            } else {
                console.error("slimRemoteAutocomplete function can only be apply on select input");
            }
        });
    };

    /**
     * Form list
     * @param {{template: string; itemClass?: string; initialize?: boolean; refresh?: boolean; btnDeleteItem?: string; btnAddItem?: string; btnClearValues?: string; contentSelector?: string; inputPrefix?: string; indexName?: string; onInitialize?: (container: JQuery, refresh: boolean) => void|Promise<void>; beforeDelete?: (btn: JQuery, item: JQuery) => boolean|Promise<boolean>; onItemDelete?: (item) => void|Promise<void>;}} options 
     */
    $.fn.formList = function (options) {
        const settings = $.extend(true, {
            initialize: true,
            refresh: false,
            btnDeleteItem: ".btn-delete-item",
            btnAddItem: ".btn-add-item",
            btnClearValues: ".btn-clear-values",
            contentSelector: ".content",
            inputPrefix: null,
            indexName: "index",
            itemClass: ".form-list-item",
            onInitialize: (container) => { },
        }, options);

        // console.log("formList plugin: settings", settings);

        return this.each(function (containerIndex, element) {
            const nativeClass = 'jfk-form-list';
            // container
            var container = $(element);

            // add native class
            if (!container.hasClass(nativeClass)) {
                container.addClass(nativeClass);
            }

            // initiate local options
            const localSettings = { ...settings };

            // extends local options
            Object.assign(localSettings, {
                template: container.data('template'),
                initialize: container.data('initialize'),
                btnDeleteItem: container.data('btnDeleteItem') ?? localSettings.btnDeleteItem,
                btnAddItem: container.data('btnAddItem') ?? localSettings.btnAddItem,
                btnClearValues: container.data('btnClearValues') ?? localSettings.btnClearValues,
                contentSelector: container.data('contentSelector'),
                inputPrefix: settings.inputPrefix ? `${settings.inputPrefix}${container.data('inputPrefix')}` : container.data('inputPrefix'),
                indexName: container.data('indexName')
            });
            // console.log("formList plugin: localSettings", localSettings);
            // items count
            var itemsCount = container.find(localSettings.itemClass).length;

            const setItemsCount = (value) => {
                itemsCount = value;
                container.data('itemsCount', value);
            };

            /**
             * Update form input and label name and id
             * @param {string} prefix prefix
             * @param {JQuery} item list item
             * @param {boolean} inDom the input is already in the dom
             * @param {boolean} debug debug mode
             */
            const updateFormItems = function (prefix, item, inDom, debug = false) {
                if (debug) {
                    console.log('formList > updateFormItems', [prefix, item.find('[data-form-input]').length, inDom])
                }
                try {
                    // inject prefix on input
                    for (let index = 0; index < item.find('[data-form-input]').length; index++) {
                        // load input
                        const input = $(item.find('[data-form-input]')[index]);

                        if (debug) {
                            console.log('formList > updateFormItems > input', [input.length, input.closest(`.${nativeClass}`).length, input.closest(`.${nativeClass}`).attr('class'), container.attr('class')]);
                        }

                        // scope
                        if (!inDom || input.closest(`.${nativeClass}`).attr('class') === container.attr('class')) {
                            if (input.is(':radio')) {
                                // console.log('setting name', `${prefix}[${input.data('name')}]`);
                                input.attr("name", `${prefix}[${input.data('name')}]`);
                                input.attr("id", `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '-')}${input.data('name')}-${input.val()}`);
                                // console.log('input html', [input.length, input.html().length]);
                            } else {
                                input.attr("name", `${prefix}[${input.data('name')}]`);
                                input.attr("id", `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '-')}${input.data('name')}`);
                            }
                        }
                    }

                    // inject prefix on label
                    for (let index = 0; index < item.find('[data-form-label]').length; index++) {
                        // input
                        const label = $(item.find('[data-form-label]')[index]);
                        // scope check
                        if (label.closest(`.${nativeClass}`).attr('class') === container.attr('class')) {
                            label.attr("for", `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '-')}${label.data('name')}-${label.data('value') ? `${label.data('value')}` : ''}`);
                        }
                    }

                    // inject prefix on form group
                    for (let index = 0; index < item.find('[data-form-group]').length; index++) {
                        // input
                        const group = $(item.find('[data-form-group]')[index]);
                        // scope check
                        if (group.closest(`.${nativeClass}`).attr('class') === container.attr('class')) {
                            group.attr("id", `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '-')}${group.data('name')}-${group.data('value') ? `${group.data('value')}` : ''}`);
                        }
                    }
                } catch (error) {
                    console.error('jfk.formList > updateFormItems error', error);
                }
            };

            // register to initialize event
            container.off("initialize");
            container.on("initialize", function (ev, refresh) {
                try {
                    ev.preventDefault();

                    // initialize the default items
                    container.find(localSettings.itemClass).each((index, elt) => {
                        // prefix
                        var prefix = `${localSettings.inputPrefix}`.replace(new RegExp(`:${localSettings.indexName}`), index);
                        var indexPrefixed = `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '_')}`;

                        // load item
                        const item = $(elt);

                        item.html(item.html()
                            .replace(new RegExp(`:${localSettings.indexName}-prefixed`, 'g'), indexPrefixed)
                            .replace(new RegExp(`:${localSettings.indexName}-rank`, 'g'), index + 1)
                            .replace(new RegExp(`:${localSettings.indexName}`, 'g'), index));

                        // set local data
                        item
                            .attr('id', `${localSettings.itemClass.substring(1)}-${index}`)
                            .data('itemIndex', index)
                            .data('itemIndexPrefixed', indexPrefixed)
                            .data('itemInputPrefix', prefix);

                        // update form items
                        updateFormItems(prefix, item, true);

                        // trigger initialize
                        if (localSettings.onInitialize) {
                            // call callback
                            localSettings.onInitialize(item, refresh ?? false);
                        }
                    });
                } catch (error) {
                    console.error("error in on('initialize'):", error);
                }
            });

            // trigger initialization
            container.triggerHandler("initialize", [localSettings.refresh]);

            // add item
            container.off('click', localSettings.btnAddItem);
            container.on("click", localSettings.btnAddItem, function (e) {
                e.stopPropagation();
                e.preventDefault();

                try {
                    // index
                    var index = itemsCount;

                    // prefix
                    var prefix = `${localSettings.inputPrefix}`.replace(new RegExp(`:${localSettings.indexName}`), index);
                    var indexPrefixed = `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '_')}`;

                    // varruct the new item line
                    var newItem = $($(document)
                        .find(localSettings.template)
                        .html()
                        .replace(new RegExp(`:${localSettings.indexName}-prefixed`, 'g'), indexPrefixed)
                        .replace(new RegExp(`:${localSettings.indexName}-rank`, 'g'), index + 1)
                        .replace(new RegExp(`:${localSettings.indexName}`, 'g'), index));

                    // inject local data
                    newItem
                        .addClass(localSettings.itemClass.substring(1))
                        .attr('id', `${localSettings.itemClass.substring(1)}-${index}`)
                        .data('itemIndex', index)
                        .data('itemIndexPrefixed', indexPrefixed)
                        .data('itemInputPrefix', prefix)
                        .css({ display: "none" });

                    // update items count
                    setItemsCount(index + 1);

                    // update form items
                    updateFormItems(prefix, newItem, false);

                    // add the new item
                    container.find(localSettings.contentSelector).append(newItem);

                    // toggle delete btn
                    if (index === 0) {
                        newItem.find(localSettings.btnDeleteItem).fadeOut('fast')
                    } else {
                        container.find(localSettings.btnDeleteItem).each((btnIndex, deleteBtn) => {
                            var btn = $(deleteBtn);
                            if (btn.not(':visible')) {
                                btn.fadeIn('slow');
                            }
                        })
                    }


                    // animate
                    newItem.slideDown("slow");

                    // trigger initialize
                    if (settings.onInitialize) {
                        settings.onInitialize(newItem);
                    }
                } catch (error) {
                    console.error("form list click", error);
                }
            });

            // delete item
            container.off('click', localSettings.btnDeleteItem);
            container.on("click", localSettings.btnDeleteItem, function (e) {
                e.stopPropagation();
                e.preventDefault();

                var btn = $(this);

                var item = $(this).closest(localSettings.itemClass);

                $.confirm({
                    title: 'Confirm!',
                    type: btn.data('confirmType') ?? 'red',
                    content: $(`Do you really want to ${btn.data('action')} this item?`).text(),
                    buttons: {
                        yes: async () => {
                            if (item) {
                                // process
                                let process = () => {
                                    item.fadeOut("slow", null, async function () {
                                        // remove item from the dom
                                        item.remove();

                                        // new count
                                        let newCount = container.find(localSettings.itemClass).length;

                                        // new items count
                                        setItemsCount(newCount);

                                        // // update form input
                                        // container.find(localSettings.itemClass).each((index, elt) => {
                                        //     let item = $(elt);

                                        //     // prefix
                                        //     let prefix = `${localSettings.inputPrefix}`.replace(new RegExp(`:${localSettings.indexName}`), index);
                                        //     let indexPrefixed = `${prefix.replace(new RegExp(/(\[|\])/, 'g'), '_')}`;

                                        //     // update local data
                                        //     item.attr('id', `${localSettings.itemClass.substring(1)}-${index}`)
                                        //         .data('itemIndex', index)
                                        //         .data('itemIndexPrefixed', indexPrefixed)
                                        //         .data('itemInputPrefix', prefix)

                                        //     // update form items
                                        //     updateFormItems(prefix, item, true);
                                        // });

                                        // on delete item callback
                                        if (localSettings.onItemDelete) {
                                            try {
                                                await localSettings.onItemDelete(item);
                                            } catch (e) { }
                                        }

                                        // add a new field
                                        if (newCount === 0) {
                                            if (localSettings.initialize) {
                                                container.find(localSettings.btnAddItem).trigger('click');
                                            }
                                        } else {
                                            // trigger initialization
                                            container.triggerHandler("initialize", [true]);
                                        }
                                    });
                                }

                                // run before delete method if exist
                                if (localSettings.beforeDelete) {
                                    if (await localSettings.beforeDelete(btn, item)) {
                                        await process();
                                    }
                                } else {
                                    await process();
                                }

                            }
                        },
                        cancel: function () {
                        }
                    }
                });

            });

            // clear values
            container.off('click', localSettings.btnClearValues);
            container.on("click", localSettings.btnClearValues, function (e) {
                e.stopPropagation();

                container.find('[data-form-input]').each(function (_inputIndex, elt) {
                    // input
                    let input = $(elt);
                    // scope
                    if (input.closest(`.${nativeClass}`).attr('class') === container.attr('class')) {
                        input.val(undefined);
                    }
                });
            });

            if (localSettings.initialize) {
                if (container.find(localSettings.itemClass).length === 0) {
                    container.find(localSettings.btnAddItem).trigger('click');
                }
            }
        });
    }


    /**
     * Table actions
     * @param {{actionFullUrl?: string; actionUrlAttr?:string; actionUrlKeyParam?: string; itemsDataKey?: string; localItemsDataKey?: string; resourceDataKey?: string; itemActionDataKey?: string; groupActionDataKey?: string; urlAttr?: string; checkboxItem: string; selectAll: string; actionMatch: {[key:string]:string|Array<string>}; groupMatch: {[key:string]:string|Array<string>}; stopPropagation?: boolean}} options options
     */
    $.fn.tableActions = function (options) {

        let settings = $.extend(true, {
            actionFullUrl: "data-url",
            actionUrlAttr: "href",
            actionUrlKeyParam: ":id",
            itemsDataKey: 'all-items',
            localItemsDataKey: 'local-items',
            resourceDataKey: 'id',
            itemActionDataKey: 'item-action',
            groupActionDataKey: 'group-action',
            urlAttr: 'href',
            actionMatch: {},
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
            try {
                var initialValues = `${container.data(settings.itemsDataKey) ?? ""
                    }`.split(",");
                if (initialValues.length !== 0) {
                    for (var value of initialValues) {
                        container
                            .find(settings.checkboxItem)
                            .each(function (_index, checkbox) {
                                if ($(checkbox).val() === value) {
                                    $(checkbox).prop("checked", true);
                                    $(checkbox).trigger("change");
                                }
                            });
                    }
                }
            } catch (error) {
                console.error(error);
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

                if (selected.length >= 1) {
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

                    if (selected.length > 1) {
                        // hide item action buttons
                        container.find(`[data-${settings.itemActionDataKey}]`).fadeOut(300);
                    } else {
                        // show item action buttons
                        container.find(`[data-${settings.itemActionDataKey}]`).not(Object.values(settings.actionMatch).map((value) => {
                            if (Array.isArray(value) && value.length !== 0) {
                                return value[0];
                            } else {
                                return value;
                            }
                        }).join(',')).each((_index, action) => {
                            try {
                                // update resource id
                                $(action).data(settings.resourceDataKey, selected[0]);
                                $(action).attr(`data-${settings.resourceDataKey}`, selected[0]);

                                // generate the full url
                                if ($(action).attr(settings.actionUrlAttr)) {
                                    const unencodedKey = settings.actionUrlKeyParam;
                                    const encodedKey = encodeURIComponent(settings.actionUrlKeyParam);

                                    $(action).attr(settings.actionFullUrl, $(action).attr(settings.actionUrlAttr)
                                        .replace(unencodedKey, selected[0])
                                        .replace(encodedKey, selected[0]));
                                }

                                // display the button
                                $(action).fadeIn(300);
                            } catch (error) {
                                console.error('JFK - $.fn.tableActions: failed to render the action', error);
                            }
                        });
                    }
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
            let selectedList = $(`${settings.checkboxItem}:checked`).map(function () {
                return $(this).val();
            }).get();

            // set selected list data
            container.data(settings.itemsDataKey, selectedList);

            /**
             * Toggle actions
             */
            toggleActions(container);

            /**
             * Group match
             * ===================
             */
            if (selectedList.length >= 1) {
                try {

                    /**
                     * Simple grouped action
                     * ---------------------------
                     */
                    const simpleGroupActionProcess = () => {
                        try {
                            // selected list
                            var selected = container.find(`${settings.checkboxItem}:checked`)
                                .map(function () {
                                    return $(this).val();
                                }).get();

                            /**
                             * @var {Array<string>} groupMatchActionSelectors group match action defined buttons
                             */
                            const groupMatchActionSelectors = [];

                            for (const key of Object.keys(settings.groupMatch)) {
                                try {
                                    var matchValue = settings.groupMatch[key];
                                    if (!Array.isArray(matchValue)) {
                                        matchValue = [matchValue];
                                    }
                                    groupMatchActionSelectors.push(matchValue[0]);
                                } catch (error) { }
                            }

                            container.find(`[data-${settings.groupActionDataKey}]`)
                                .not(`${groupMatchActionSelectors.join(',')}`)
                                .each((index, elmt) => {
                                    // load action
                                    const action = $(elmt);
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
                                })
                        } catch (error) {
                            console.error("JFK simpleGroupActionProcess error:", error)
                        }
                    }


                    /**
                     * Group match selected
                     * ----------------------
                     */
                    const groupActionMatchProcess = () => {
                        try {
                            for (var groupKey of Object.keys(settings.groupMatch)) {
                                // selected list
                                var selected = container.find(`${settings.checkboxItem}${groupKey}:checked`).map(function () {
                                    return $(this).val();
                                }).get();

                                // key value
                                var keyValue = settings.groupMatch[groupKey];

                                if (Array.isArray(keyValue)) {
                                    // action button
                                    var action = container.find(keyValue[0]);
                                    // selected count
                                    if (selected.length !== 0) {
                                        // set items count indicator
                                        setItemsCount(action, selected.length);
                                        // set selected value
                                        action.data(keyValue.length > 1 ? keyValue[1] : settings.localItemsDataKey, selected);
                                        // // linearized keys
                                        // action.attr("data-keys", selected.join(","));
                                        // show action
                                        action.fadeIn(300);
                                    } else {
                                        // hide action
                                        action.fadeOut(300);
                                    }
                                } else {
                                    // action button
                                    var action = container.find(keyValue);
                                    // selected count
                                    if (selected.length !== 0) {
                                        // set items count indicator
                                        setItemsCount(action, selected.length);
                                        // set selected value
                                        action.data(settings.localItemsDataKey, selected);
                                        // // linearized keys
                                        // action.attr("data-keys", selected.join(","));
                                        // show action
                                        action.fadeIn(300);
                                    } else {
                                        // hide action
                                        action.fadeOut(300);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error("JFQ groupActionMatchProcess error:", error);
                        }
                    }

                    simpleGroupActionProcess();
                    groupActionMatchProcess();
                } catch (error) {
                    console.error('tableActions > groupKey : error', error);
                }
            }

            /**
             * Action match
             * ===================
             */
            if (selectedList.length === 1) {
                for (let actionKey of Object.keys(settings.actionMatch)) {
                    // selected list
                    let selected = container.find(`${settings.checkboxItem}${actionKey}:checked`).map(function () {
                        return $(this).val();
                    }).get();

                    // key value
                    let keyValue = settings.actionMatch[actionKey];
                    // console.log("container.find(keyValue)", keyValue, container.find(keyValue).length, selected.length === 1);
                    // action button
                    container.find(keyValue).each(function (_actionIndex, actionElmt) {
                        // action elmt
                        let action = $(actionElmt);

                        if (selected.length === 1) {
                            // update resource id
                            action.data(settings.resourceDataKey, selected[0]);
                            action.attr(`data-${settings.resourceDataKey}`, selected[0]);

                            // generate the full url
                            if (action.attr(settings.actionUrlAttr)) {
                                action.attr(settings.actionFullUrl, action.attr(settings.actionUrlAttr).replace(settings.actionUrlKeyParam, selected[0]));
                            }

                            // show action
                            action.fadeIn(300);
                        } else {
                            // hide action
                            action.fadeOut(300);
                        }
                    })
                }
            }
        }

        return this.each(function (index, element) {
            // container
            let container = $(element);

            // checkboxes initialization
            initializeSelectedCheckbox(container);

            /**
             * Listen to checkbox click and stop propagation because there is another handler on the top (tr)
             */
            if (settings.stopPropagation) {
                container.on("click", `${settings.checkboxItem}`, function (event) {
                    event.stopImmediatePropagation();
                    event.stopPropagation();
                    // prevent up handlers to catch the event            
                    event.stopPropagation();
                });
            }

            /**
             * Listen to checkbox item change
             */
            container.off("change", `${settings.checkboxItem}`);
            container.on("change", `${settings.checkboxItem}`, function (event) {
                changeCallback(container);
            });

            /**
             * Listen to select all checkbox
             */
            container.off('change', `${settings.selectAll}`);
            container.on('change', `${settings.selectAll}`, function (event) {
                var self = $(this);
                container.find(settings.checkboxItem).each((_index, elem) => {
                    $(elem).prop("checked", self.prop("checked"));
                });

                // watch selected
                changeCallback(container);
            });

            // toggle actions (initialization)
            toggleActions(container);
        });
    }

    /**
     * Remote multiple select with autocomplete
     * @param {{parentContainerSelector?:string; initialValueAttr?:string; urlAttr?: string;selectedItemClass?:string;selectedItemPrefix?:string;selectedItemsContainerClass?:string; containerClass?:string;}} options options
     * @returns 
     */
    $.fn.remoteMultipleSelectWithAutocomplete = function (options) {
        let settings = $.extend(true, {
            initialValueAttr: 'data-value',
            urlAttr: 'data-url',
            selectedItemClass: 'selected-item',
            selectedItemsContainerClass: 'selected-items',
        }, options);

        return this.each(function (_index, element) {
            // recipients input
            const recipientsInput = $(element);

            // hide input
            recipientsInput.css({ display: "none", border: "none" });

            // item input
            const randomID = `${Math.round(Math.random() * 10000)}`;

            // container
            const customInput = $(`<div id="multiple-select-${randomID}" class="${settings.containerClass ? `${settings.containerClass} ` : ''}flex items-stretch flex-wrap border rounded-sm multiple-select flex-auto p-2 gap-2"></div>`);

            // selected container
            const selectedContainer = $(`<div data-items="" class="${settings.selectedItemsContainerClass} inline-flex flex-wrap gap-2"></div>`);

            // insert selected container
            customInput.append(selectedContainer);

            // auto complete input
            const acInput = $('<input type="text" class="ac-input border-none flex-auto" />');

            // update placeholder
            acInput.attr("placeholder", recipientsInput.attr("placeholder"));

            // add input
            customInput.append(acInput);

            /**
             * Get selected items
             */
            const getSelectedItems = function () {
                try {
                    /**
                 * @type Array<string>
                 */
                    if (selectedContainer.data("items") && `${selectedContainer.data("items")}`.length !== 0) {
                        const selectedItems = selectedContainer.data("items").split(/,/);
                        // return items array
                        return selectedItems;
                    } else {
                        return [];
                    }
                } catch (error) {
                    console.warn("getSelectedItems error", error);
                    return [];
                }
            }

            /**
             * Check if the given value is selected
             * @param {string} value value
             */
            const isSelected = function (value) {
                return getSelectedItems().includes(value);
            }

            /**
             * Add selected value
             * @param {string} value selected value
             * @returns boolean
             */
            const addSelectedItemValue = function (value) {
                /**
                 * @type Array<string>
                 */
                const selectedItems = getSelectedItems();
                // add selected
                if (!selectedItems.includes(value)) {
                    // add new value
                    selectedItems.push(value);
                    // update selected container items list
                    selectedContainer.data("items", selectedItems.join(","));
                    // update recipients value
                    recipientsInput.attr("value", selectedItems.join(","));
                    return true;
                } else {
                    return false;
                }
            }

            /**
             * Add selected item tag
             * @param {{value: string; label:string;}} item item
             */
            const addSelectedItem = function (item) {
                // close icon
                let deleteIcon = $(`<i class="fa fa-times cursor-pointer"></>`);
                // selectedItem
                let selectedItem = $(`<span data-value="${item.value}" data-label="${item.label}" class="px-2 py-1 rounded-full bg-gray-200 border font-semibold ${settings.selectedItemClass} inline-flex items-center flex-nowrap gap-2">${settings.selectedItemPrefix ?? ''}<span>${item.label}</span></span>`);
                //  add delete icon
                selectedItem.append(deleteIcon);
                // onclick process
                deleteIcon.on("click", function (ev) {
                    ev.stopImmediatePropagation();
                    ev.stopPropagation();
                    ev.preventDefault();
                    // remove selected item
                    removeSelectedItem($(this).closest(`.${settings.selectedItemClass}`).data("value"));
                    // self kill
                    $(this).closest(`.${settings.selectedItemClass}`).remove();
                });

                // append item
                selectedContainer.append(selectedItem);
            }

            /**
             * Remove selected value
             * @param {string} value selected value
             * @returns boolean
             */
            const removeSelectedItem = function (value) {
                /**
                 * @type Array<string>
                 */
                const selectedItems = getSelectedItems();
                // add selected
                if (selectedItems.includes(value)) {
                    // update selected container items list
                    selectedContainer.data("items", selectedItems.filter(v => v !== value).join(","));
                    // update recipients value
                    recipientsInput.attr("value", selectedItems.filter(v => v !== value).join(","));
                    return true;
                } else {
                    return false;
                }
            }

            /**
             * Search cache
             * @type any
             */
            const cache = {};

            /**
             * Previous ajax request
             * @type JQuery.jqXHR<any>
             */
            let previousAjaxRequest = undefined;

            // initialize autocomplete
            acInput.on("keydown", function (event) {
                if (event.code === $.ui.keyCode.TAB &&
                    $(this).autocomplete("instance").menu.active) {
                    event.preventDefault();
                }
            }).autocomplete({
                source: function (request, response) {
                    // create term
                    let term = request.term;
                    // cached data exists
                    if (cache[term] && Array.isArray(cache[term])) {
                        // submit response
                        response(cache[term].filter(v => !getSelectedItems().includes(v.value)));
                    } else {
                        // cancel previous request if exists
                        if (previousAjaxRequest) {
                            try {
                                // abort the previous request
                                previousAjaxRequest.abort();
                                // clear previous request
                                previousAjaxRequest = undefined;
                            } catch (error) {
                                console.error('previousAjaxRequest.abort', error);
                            }
                        }
                        // fetch result
                        previousAjaxRequest = $.ajax({
                            url: recipientsInput.attr(settings.urlAttr),
                            dataType: "json",
                            data: {
                                term: term,
                                limit: 5,
                            },
                            /**
                             * success payload
                             * @param {Array<{uuid: string; first_name?:string; middle_name?:string; last_name:string;}>} data 
                             */
                            success: function (data) {
                                // format result
                                const items = data.map((item) => {
                                    return {
                                        value: item.uuid,
                                        label: [item.first_name, item.middle_name, item.last_name].join(" ")
                                    }
                                });

                                // cache result
                                if (items.length !== 0) {
                                    cache[term] = items;
                                }

                                // submit response
                                response(items.filter(v => !getSelectedItems().includes(v.value)));
                            }
                        });
                    }
                },
                minLength: 2,
                focus: function () {
                    // prevent value inserted on focus
                    return false;
                },
                select: function (event, ui) {
                    // not selected
                    if (!isSelected(ui.item.value)) {
                        // append item
                        addSelectedItem(ui.item);

                        // update selected items
                        addSelectedItemValue(ui.item.value);
                    }

                    // clear the autocomplete input
                    this.value = "";
                    return false;
                },
                open: function (event, ui) {
                    // when used on a bootstrap's modal dialog, the autocomplete drop-down appears behind the modal.
                    // this put it back on top
                    $("ul.ui-autocomplete").css("z-index", 5000);
                }
            });

            // load initial value if exists
            let initialValue = recipientsInput.attr(settings.initialValueAttr);
            // initial value exists
            if (typeof initialValue === "string" && `${initialValue}`.length !== 0) {
                try {
                    if (typeof settings.parentContainerSelector === "string" && `${settings.parentContainerSelector}`.length !== 0) {
                        // console.log("loading overlay show");
                        recipientsInput.closest(settings.parentContainerSelector).LoadingOverlay("show");
                    }
                } catch (error) {
                    console.warn("LoadingOverlay plugin call error", error);
                }
                $.ajax({
                    url: recipientsInput.attr(settings.urlAttr),
                    dataType: "json",
                    data: {
                        initial: initialValue,
                    },
                    /**
                     * success payload
                     * @param {Array<{uuid: string; first_name?:string; middle_name?:string; last_name:string;}>} data 
                     */
                    success: function (data) {
                        // format result
                        const items = data.map((item) => {
                            return {
                                value: item.uuid,
                                label: [item.first_name, item.middle_name, item.last_name].join(" ")
                            }
                        });
                        // console.log("loaded initial items", items);
                        // add items
                        items.forEach((item) => {
                            // append item
                            addSelectedItem(item);
                            // append item value
                            addSelectedItemValue(item.value);
                        });
                    }
                }).always(function () {
                    try {
                        if (typeof settings.parentContainerSelector === "string" && `${settings.parentContainerSelector}`.length !== 0) {
                            // console.log("loading overlay hide");
                            recipientsInput.closest(settings.parentContainerSelector).LoadingOverlay("hide");
                        }
                    } catch (error) {
                        console.warn("LoadingOverlay plugin call error", error);
                    }
                });
            }

            // insert container
            customInput.insertBefore(recipientsInput);
        });
    }

    /**
     * Trigger a form submit dynamically
     * @param {{defaultErrorCatching?:boolean, method?: string; triggerSelector: string|Array<string>; beforeStart: (form: JQuery, trigger: JQuery) => void|Promise; successCallback: (data: any, status: JQuery<any>, xhr: JQuery.jqXHR<any>, form: JQuery, trigger: JQuery) => void|Promise; errorCallback: (xhr: JQuery.jqXHR<any>, form: JQuery, trigger: JQuery) => void|Promise; finishCallback: (form: JQuery, trigger: JQuery) => void|Promise;}} options parameters
     * @returns 
     */
    $.fn.distantSubmit = function (options) {
        let settings = $.extend(true, {
            defaultErrorCatching: true,
            mehtod: 'POST',
        }, options);

        return this.each(function (_index, element) {
            // trigger element
            let trigger = undefined;

            // clear event
            $(document).off('click', Array.isArray(settings.triggerSelector) ? settings.triggerSelector.join(',') : settings.triggerSelector);
            // listen to trigger
            $(document).on("click", Array.isArray(settings.triggerSelector) ? settings.triggerSelector.join(',') : settings.triggerSelector, function (e) {
                e.preventDefault();
                // update trigger
                trigger = $(this);
                // trigger submit
                $(element).trigger("submit");
            });

            // off event
            $(element).off('submit');

            // listen to submit
            $(element).on('submit', async function (e) {
                e.preventDefault();

                // self
                const self = $(this);

                // get form element
                let formElement = self.get()[0];

                // set form data
                let formData = new FormData(formElement)

                // before start
                if (settings.beforeStart) {
                    await settings.beforeStart(self, trigger);
                }

                // submit data
                $.ajax({
                    url: self.attr("action"),
                    data: formData,
                    processData: false,
                    contentType: false,
                    cache: false,
                    type: settings.method,
                    success: async function (data, status, xhr) {
                        // on success
                        if (settings.successCallback) {
                            await settings.successCallback(data, status, xhr, self, trigger);
                        }
                    },
                    error: async (jqXhr) => {
                        // catch error
                        if (settings.defaultErrorCatching === true) {
                            if (jqXhr.responseJSON) {
                                $.alert({
                                    title: 'Operation failed',
                                    type: 'red',
                                    content: $(jqXhr.responseJSON.message ?? 'The server encountered a problem while processing your request, please try again later.').text()
                                })
                            } else {
                                $.alert({
                                    title: 'Operation failed',
                                    type: 'red',
                                    content: $(jqXhr.responseText ?? 'The server encountered a problem while processing your request, please try again later.').text()
                                })
                            }
                        }

                        // on error
                        if (settings.errorCallback) {
                            await settings.errorCallback(jqXhr, self, trigger);
                        }
                    },
                    complete: async function () {
                        // on finish
                        if (settings.finishCallback) {
                            await settings.finishCallback(self, trigger);
                        }
                    }
                });
            });
        });
    }
})(jQuery, document)