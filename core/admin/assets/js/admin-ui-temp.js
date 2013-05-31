// # Temporary Admin UI

/*global document, jQuery */

(function ($) {
    "use strict";

    // UTILS

    /**
     * Allows to check contents of each element exactly
     * @param obj
     * @param index
     * @param meta
     * @param stack
     * @returns {boolean}
     */
    $.expr[":"].containsExact = function (obj, index, meta, stack) {
        return (obj.textContent || obj.innerText || $(obj).text() || "") === meta[3];
    };


    $(document).ready(function () {

        // ## Set interactions for all menus
        // This finds all visible '.overlay' elements and hides them upon clicking away from the element itself.
        $("body").on('click', function (event) {
            var $target = $(event.target);
            if (!$target.parents().is(".overlay:visible") && !$target.is(".overlay:visible")) {
                $("body").find(".overlay:visible").fadeOut();
            }
        });

        // EDITOR / NOTIFICATIONS

        $('.entry-content header, .entry-preview header').on('click', function () {
            $('.entry-content, .entry-preview').removeClass('active');
            $(this).closest('section').addClass('active');
        });

        $('.entry-title .icon-fullscreen').on('click', function (e) {
            e.preventDefault();
            $('body').toggleClass('fullscreen');
        });

        $('.options.up').on('click', function (e) {
            e.stopPropagation();
            $(this).next("ul").fadeToggle(200);
        });

        $('.editor-options').on('click', 'li', function (e) {
            $('.button-save').data("state", $(this).data("title")).attr('data-state', $(this).data("title")).text($(this).text());
            $('.editor-options .active').removeClass('active');
            $(this).addClass('active');
        });
    });
}(jQuery));