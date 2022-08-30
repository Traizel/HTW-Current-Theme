import $ from 'jquery';
import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.dropdown';
import utils from '@bigcommerce/stencil-utils';
import LocalCart from '../global/local-cart';
import { updateCartThumbnails } from '../custom/product-patterned-vinyl';

export const CartPreviewEvents = {
	close: 'closed.fndtn.dropdown',
	open: 'opened.fndtn.dropdown',
};

export default function (secureBaseUrl, cartId) {
	const touchDevice = 'ontouchstart' in document;
	const localCart = new LocalCart();
	const loadingClass = 'is-loading';
    const $cart = $('.header [data-cart-preview]');
	const $body = $('body');
	const $cartDropdown = $('.header #cart-preview-dropdown');
	const $cartLoading = $('<div class="loadingOverlay"></div>');
	const openClass = 'is-open f-open-dropdown';
	let fetching = false;
	console.log(localCart.qty);
	if (localCart.qty > 0) {
		$('.cart-quantity')
			.text(localCart.qty)
			.addClass('countPill--positive');
	}

	const calculateCartSubtotal = () => {
		const cartPreviewSubtotal = document.querySelector('.previewCartAction-subtotal-price');
		if (cartPreviewSubtotal) {
			const subtotal = Array.prototype.slice.call(document.querySelectorAll('.previewCartItem')).map(el => {
				const qty = parseInt(el.getAttribute('data-quantity')) || 0;
				const unitPrice = parseFloat(el.getAttribute('data-unit-price')) || 0;
				return unitPrice * qty;
			}).reduce((acc, price) => {
				const priceFloat = parseFloat(price);
				if (!isNaN(priceFloat)) {
					acc += priceFloat;
				}
				return acc;
			}, 0);
			cartPreviewSubtotal.innerText = `$${parseFloat(subtotal).toFixed(2)}`;
		}
	};
	
	const checkForStaleCartPreview = () => {
		const cartPreview = document.querySelector('.previewCart');
		const countPill = document.querySelector('.countPill');
		const cartPreviewPillCount = parseInt(countPill.innerText) || 0;
		if (cartPreview === null || cartPreview.childNodes.length === 0) {
			return true;
		}
		const cartPreviewItems = Array.prototype.slice.call(document.querySelectorAll('.previewCartItem'));
		const cartPreviewItemCount = cartPreviewItems.reduce((acc, item) => {
			const itemQtyInt = parseInt(item.getAttribute('data-quantity')) || 0;
			acc += itemQtyInt;
			return acc;
		}, 0);
		return cartPreviewItemCount !== cartPreviewPillCount;
	};
	
	const fetchCartPreviewContent = () => {
		const cartPreviewIsStale = checkForStaleCartPreview();
		if (!fetching && cartPreviewIsStale) {
			fetching = true;
			const options = {
				template: 'common/cart-preview',
			};
			$cartDropdown
				.addClass(loadingClass)
				.html($cartLoading);
			$cartLoading.show();
			utils.api.cart.getContent(options, (err, response) => {
				$cartDropdown
					.removeClass(loadingClass)
					.html(response);
				// ignore upading the local cart and pill count on cart page, already done.
				if (window.location.pathname !== '/cart.php') {
					localCart.updateLocalCart();
					if (localCart.qty > 0) {
						$('.cart-quantity')
							.text(localCart.qty)
							.addClass('countPill--positive');
					}
				}
				if (!touchDevice) {
					updateCartThumbnails('.previewCart', localCart.items);
					calculateCartSubtotal();
					$cartDropdown.addClass(openClass);
					$cartLoading.hide();
				}
				fetching = false;
			});
			return false;
		}
		if (!touchDevice) {
			$cartDropdown.addClass(openClass);
		}
	};

	$body.on('cart-quantity-update', (event, quantity) => {
        $cart.attr('aria-label', (_, prevValue='') => prevValue.replace(/\d+/, quantity));

        if (!quantity) {
            $cart.addClass('navUser-item--cart__hidden-s');
        } else {
            $cart.removeClass('navUser-item--cart__hidden-s');
        }

        $('.cart-quantity')
            .text(quantity)
            .toggleClass('countPill--positive', quantity > 0);
        if (utils.tools.storage.localStorageAvailable()) {
            localStorage.setItem('cart-quantity', quantity);
        }
    });

	$body.on('update-cart-preview', () => {
		fetchCartPreviewContent();
	});

	if (!touchDevice) {
		$('.navUser-item--cart').on('mouseenter', () => {
			fetchCartPreviewContent();
		});
		$('.navUser-item--cart').on('mouseleave', () => {
			$cartDropdown
				.removeClass(openClass);
		});
	}
	$body.on('click', () => {
		$cartDropdown
			.removeClass(openClass);
	});

	let quantity = 0;

	if (cartId) {
        // Get existing quantity from localStorage if found
        if (utils.tools.storage.localStorageAvailable()) {
            if (localStorage.getItem('cart-quantity')) {
                quantity = Number(localStorage.getItem('cart-quantity'));
                $body.trigger('cart-quantity-update', quantity);
            }
        }

        // Get updated cart quantity from the Cart API
        const cartQtyPromise = new Promise((resolve, reject) => {
            utils.api.cart.getCartQuantity({ baseUrl: secureBaseUrl, cartId }, (err, qty) => {
                if (err) {
                    // If this appears to be a 404 for the cart ID, set cart quantity to 0
                    if (err === 'Not Found') {
                        resolve(0);
                    } else {
                        reject(err);
                    }
                }
                resolve(qty);
            });
        });

        // If the Cart API gives us a different quantity number, update it
        cartQtyPromise.then(qty => {
            quantity = qty;
            $body.trigger('cart-quantity-update', quantity);
        });
    } else {
        $body.trigger('cart-quantity-update', quantity);
    }
}
