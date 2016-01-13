'use strict';

angular.module('clientApp', [
    'ui.router',
    'pascalprecht.translate',
    'fef',
    'bento.modern',
    'tmh.dynamicLocale',
	'angular-loading-bar',
	'LocalStorageModule',
	'tmh.dynamicLocale',
    'ui.bootstrap', // for modal dialogs
    'ngResource',
    'ngCookies',
    'ngCacheBuster',
    'infinite-scroll'
  ])
    .run(function ($rootScope, $location, $window, $http, $state, $cookies, $translate, Language, Auth, Principal, ENV, VERSION) {
        $rootScope.ENV = ENV;
        $rootScope.VERSION = VERSION;

	// set the CSRF token here
	//$http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;

        $rootScope.$on('$stateChangeStart', function (event, toState, toStateParams) {
            $rootScope.toState = toState;
            $rootScope.toStateParams = toStateParams;

            if (Principal.isIdentityResolved()) {
                Auth.authorize();
            }

            // Update the language
            Language.getCurrent().then(function (language) {
                $translate.use(language);
            });

        });

        $rootScope.$on('$stateChangeSuccess',  function(event, toState, toParams, fromState, fromParams) {
            var titleKey = 'global.title' ;

            $rootScope.previousStateName = fromState.name;
            $rootScope.previousStateParams = fromParams;

            // Set the page title key to the one configured in state or use default one
            if (toState.data.pageTitle) {
                titleKey = toState.data.pageTitle;
            }

            $translate(titleKey).then(function (title) {
                // Change window title with translated one
                $window.document.title = title;
            });

        });

        $rootScope.back = function() {
            // If previous state is 'activate' or do not exist go to 'home'
            if ($rootScope.previousStateName === 'activate' || $state.get($rootScope.previousStateName) === null) {
                $state.go('home');
            } else {
                $state.go($rootScope.previousStateName, $rootScope.previousStateParams);
            }
        };
    })
    .factory('authExpiredInterceptor', function ($rootScope, $q, $injector, localStorageService) {
        return {
            responseError: function(response) {
                // If we have an unauthorized request we redirect to the login page
                // Don't do this check on the account API to avoid infinite loop
                if (response.status == 401 && response.data.path !== undefined && response.data.path.indexOf("/api/account") == -1){
                    var Auth = $injector.get('Auth');
                    var $state = $injector.get('$state');
                    var to = $rootScope.toState;
                    var params = $rootScope.toStateParams;
                    Auth.logout();
                    $rootScope.returnToState = to;
                    $rootScope.returnToStateParams = params;
                    $state.go('login');
                }
                return $q.reject(response);
            }
        };
    })
.config(function ($stateProvider, $urlRouterProvider, $httpProvider, $locationProvider, $translateProvider, tmhDynamicLocaleProvider, httpRequestInterceptorCacheBusterProvider) {

        //enable CSRF
//        $httpProvider.defaults.xsrfCookieName = 'CSRF-TOKEN';
//        $httpProvider.defaults.xsrfHeaderName = 'X-CSRF-TOKEN';

        //Cache everything except rest api requests
        httpRequestInterceptorCacheBusterProvider.setMatchlist([/.*api.*/, /.*protected.*/], true);

        $urlRouterProvider.otherwise('/');

        $stateProvider.state('site', {
            'abstract': true,
            views: {
              'headbar@': {
                  templateUrl: 'scripts/components/navbar/headbar.html',
                  controller: 'NavbarController'
              },
                'topbar@': {
                    templateUrl: 'scripts/components/navbar/topbar.html',
                    controller: 'NavbarController'
                },
                'navbar@': {
                    templateUrl: 'scripts/components/navbar/navbar.html',
                    controller: 'NavbarController'
                }
            },
            resolve: {
                authorize: ['Auth',
                    function (Auth) {
                        return Auth.authorize();
                    }
                ],
                translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                    $translatePartialLoader.addPart('global');
                }]
            }
        });

        $httpProvider.interceptors.push('authExpiredInterceptor');


        // Initialize angular-translate
        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: 'i18n/{lang}/{part}.json'
        });

        $translateProvider.preferredLanguage('en');
        $translateProvider.useCookieStorage();
        $translateProvider.useSanitizeValueStrategy('escaped');

        tmhDynamicLocaleProvider.localeLocationPattern('vendor/bower_components/angular-i18n/angular-locale_{{locale}}.js');
        tmhDynamicLocaleProvider.useCookieStorage();
        tmhDynamicLocaleProvider.storageKey('NG_TRANSLATE_LANG_KEY');
  });

/*
    $stateProvider
      .state('home', { url:'/home', templateUrl: 'js/components/home/home-view.html'})
      .state('transactions', {
            url:'/transactions',
            templateUrl: 'js/components/transaction/transaction-view.html'})
      .state('transaction', {
            url:'/transaction/:transactionId',
            templateUrl: 'js/components/transaction/transaction-detail.html'
        })

    $urlRouterProvider.otherwise('/home');
  })
.config(function ($translateProvider) {
    $translateProvider.useStaticFilesLoader({
      prefix: 'languages/lang-',
      suffix: '.json'
    });
    $translateProvider.preferredLanguage('en');
  })
;
  */
