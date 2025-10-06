$(document).on('ready', function() {

    $("#post-gallery").owlCarousel({

        navigation: false, // Show next and prev buttons
        slideSpeed: 3000,
        paginationSpeed: 400,
        singleItem: true,
        pagination: true,
        autoPlay: true,
        addClassActive: true
        

        // "singleItem:true" is a shortcut for:
        // items : 1, 
        // itemsDesktop : false,
        // itemsDesktopSmall : false,
        // itemsTablet: false,
        // itemsMobile : false

    });

});





