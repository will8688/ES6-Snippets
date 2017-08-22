'use strict';
import ApiEvent from '../../../core__api';
import Api from '../../../core__observable_api';

class CoreUIService {
	constructor() {
		this.css = {
			activeCls: 'is-active',
			hiddenCls: 'is-hidden',
			loadedCls: 'loaded',
			sportIconCls: 'sport-icon',
			fixedCls: 'fixed',
			noScrollCls: 'no-scroll',
			betslipCls:'.js-betslip',
			headerMobileCls : '.header-mobile',
			betslipScrollContainerCls : '.js-betslip-scroll-container',
			betslipHeaderCls :  '.js-betslip-header',
			betslipSummaryCls : '.js-betslip-summary',
			headerCls :  '.header',
			mainCls :  '.main',
			navigationCls :  '.navigation',
			navigationContainerCls :  '.navigation__container',
			navigationHiddenContainerCls :  '.navigation__hidden-container',
			scrollToCls :  '.js-scroll-top',
			siteCoverCls :  '.site-cover',
			allSportsTogglerCls : '.navigation__main__all-sports-toggler__tab',
			anchorsCls : '.main--text a[href^=#]',
			mobileNavigationBarCls : '.mobile-navigation-bar',
			breadcrumbs : '.breadcrumbs'
		};
		this.$breadcrumbs = $( this.css.breadcrumbs );
		this.$header = $( this.css.headerCls );
		this.$main = $( this.css.mainCls );
		this.$navigation = $( this.css.navigationCls );
		this.$navigationContainer = $( this.css.navigationContainerCls );
		this.$navigationHiddenContainer = $( this.css.navigationHiddenContainerCls );
		this.$scrollTop = $( this.css.scrollToCls );
		this.$siteCover = $( this.css.siteCoverCls );
		this.$betslip = $( this.css.betslipCls );
		this.$headerMobile = $( this.css.headerMobileCls );
		this.$betslipScrollContainer = $( this.css.betslipScrollContainerCls  );
		this.$betslipHeader = $( this.css.betslipHeaderCls );
		this.$betslipSummary = $( this.css.betslipSummaryCls );
		this.$allSportsToggler = $( this.css.allSportsTogglerCls );
		this.$anchors = $( this.css.anchorsCls );
		this.$mobileNavigationBar = $( this.css.mobileNavigationBarCls );
		this.betslipActive = false;
		this.fixed = false;
		this.html5 = true;
		this.navigationActive = false;
		this.userPanelActive = false;
		this.observable = Api.observable;

	}
	breakpointRefresh() {
		if (document.documentElement.currentStyle) {
			return document.documentElement.currentStyle.fontFamily;
		}
		if (window.getComputedStyle) {
			return window.getComputedStyle(document.documentElement, null).getPropertyValue('font-family');
		}
	}
	isMobile() {
		if (this.breakpoint.indexOf('tablet') !== -1 || this.breakpoint.indexOf('phone') !== -1) {
			return true;
		} else {
			return false;
		}
	}
	isSVGSupported() {
		return !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;
	}
	noScroll(add) {
		if (add) {
			$('html').addClass(this.css.noScrollCls);
			$('body').addClass(this.css.noScrollCls);
		} else {
			$('html').removeClass(this.css.noScrollCls);
			$('body').removeClass(this.css.noScrollCls);
		}
	}
	betslipHide() {
		if (this.$betslip) {
			this.$betslip.removeClass(this.css.activeCls);
			this.betslipActive = false;
			if (this.navigationActive === false) {
				this.noScroll(false);

				if (this.overrideBetSlipShowHide) {
					this.$betslipCloseBtn.addClass(this.css.hiddenCls);
					this.$betslipOpenBtn.removeClass(this.css.hiddenCls);
				}

			}
		}
	}
	betslipShow() {
		this.$betslipisActive = this.$betslip.hasClass(this.css.activeCls);

		if (!this.$betslipisActive) {

			this.$betslip.addClass(this.css.activeCls);
			this.betslipActive = true;

			if (this.overrideBetSlipShowHide) {
				this.$betslipCloseBtn.removeClass(this.css.hiddenCls);
				this.$betslipOpenBtn.addClass(this.css.hiddenCls);
			}

			this.resize();
		}
	}
	getMaxHeight() {
		const windowHeight = $(window).height();
		const betslipHeaderHeight = this.$betslipHeader.height();
		const betslipSummaryHeight = this.$betslipSummary.height();
		const headerMobileHeight = (this.isMobile()) ? this.$headerMobile.height() : 0;
		const headerWebHeight = (this.isMobile()) ? 0 : this.$header.height();
		const result = windowHeight-this.betslipPositionTop - this.betslipPadding - betslipHeaderHeight - betslipSummaryHeight - headerMobileHeight - headerWebHeight;
		return result;
	}
	betslipResize() {
		if (this.isMobile()) {
			this.$betslipScrollContainer.css({
				'height': this.getMaxHeight()
			});
		} else {
			(this.overrideBetSlipSize) ? this.$betslipScrollContainer.css({ 'max-height': this.getMaxHeight() }) : this.$betslipScrollContainer.css({ 'height': 'auto' });
		}
	}
	betslipShowHide() {
		this.$betslip.hasClass(this.css.activeCls) ? this.betslipHide() : this.betslipShow();
	}
	siteCover() {
		this.observable.fromEvent(this.$siteCover, 'click')
			.debounce(100)
			.subscribe(() => {
				if (this.navigationActive) {
					this.navigationShowHide();
				} else if (this.userPanelActive) {
					this.userPanelShowHide();
				}
			});
	}
	navigationShowHide() {
		if (!this.navigationActive) {
			this.navigationActive = true;
		} else {
			this.navigationActive = false;
		}
		if (this.userPanelActive) {
			this.userPanelActive = false;
			this.$header.toggleClass(this.css.activeCls);
		} else {
			this.$siteCover.toggleClass(this.css.activeCls);
		}

		this.$allSportsToggler.toggleClass(this.css.activeCls);
		this.$navigation.toggleClass(this.css.activeCls);
	}
	userPanelShowHide() {
		if (!this.userPanelActive) {
			this.userPanelActive = true;
			this.noScroll(true);
		}
		else {
			this.userPanelActive = false;
			if (this.betslipActive === false) {
				this.noScroll(false);
			}
		}
		this.$header.toggleClass(this.css.activeCls);
		this.$siteCover.toggleClass(this.css.activeCls);
	}
	resize() {
		this.headerOffsetPosition = this.$header.offset().top + this.$header.height();
		this.breakpoint = this.breakpointRefresh();
		this.betslipResize();
		this.isNavigationActive();
		ApiEvent.trigger('horsecarouselapp:resize', this.breakpoint);
	}
	scroll() {
		if (!this.isMobile()) {
			if (this.headerOffsetPosition - $(window).scrollTop() - this.scrollHeight <= 0) {
				if (!this.fixed) {
					this.fixed = true;
					this.$navigation.addClass(this.css.fixedCls);
					this.$header.addClass(this.css.fixedCls);
					this.$breadcrumbs.addClass(this.css.fixedCls);
					if (this.fixedMainContent) {
						this.$main.addClass(this.css.fixedCls);
					}
				}
			} else {
				if (this.fixed) {
					this.fixed = false;
					this.$navigation.removeClass(this.css.fixedCls);
					this.$header.removeClass(this.css.fixedCls);
					this.$breadcrumbs.removeClass(this.css.fixedCls);
					if (this.fixedMainContent) {
						this.$main.removeClass(this.css.fixedCls);
					}
				}
			}
			if ( this.resizeBetslipSizeOnScroll) {
				this.betslipResize();
			}
		} else {
			if (this.fixed) {
				this.fixed = false;
				this.$navigation.removeClass(this.css.fixedCls);
				this.$header.removeClass(this.css.fixedCls);
			}
		}
	}
	isNavigationActive() {
		if (this.navigationActive && this.isMobile() === false && this.fixed === false) {
			this.$main.css({
				'padding-top': this.$header.outerHeight() + this.$navigationContainer.outerHeight() + this.height + 'px'
			});
		} else {
			this.$main.css({
				'padding-top': ''
			});
		}
	}
	setGlobalObservables() {
		this.observable.fromEvent(window, 'resize')
			.subscribe(() => {
				this.resize();
				Api.emit('window:event:resize');
			});
		this.observable.fromEvent(window, 'scroll')
			.subscribe(() => {
				this.scroll();
				Api.emit('window:event:scroll');
			});
		this.observable.fromEvent(this.$anchors, 'click')
			.subscribe((e) => {
				e.preventDefault();
				$(document).scrollTop($($(this).attr('href')).position().top + this.positionHeight);
			});
		this.observable.fromEvent(this.$scrollTop, 'click')
			.subscribe(() => {
				document.getElementsByTagName('body')[0].scrollIntoView(this.scrollBehavior);
			});
	}
	setGlobalEventListeners() {
		ApiEvent.handleRequest('ui:check:mobile', () => {
			return this.isMobile();
		});
		ApiEvent.handleRequest('ui:get:breakpoint', () => {
			return this.breakpoint;
		});
		ApiEvent.handleRequest('ui:userpanel:showhide', () => {
			this.userPanelShowHide();
		});
		ApiEvent.handleRequest('ui:navigation:showhide', () => {
			this.navigationShowHide();
		});
	}
}
export default CoreUIService;