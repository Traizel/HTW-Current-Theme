const fitValueToOptionRange = (value, options) => {
	const sortedOptions = options.map(o => {
		const text = o.textContent.trim();
		if (text.indexOf('-') > -1) {
			return parseInt(text.split('-')[1], 10);
		}
		return parseInt(text, 10);
	}).filter(v => (!isNaN(v))).sort((a,b) => {
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	});
	const min = sortedOptions[0];
	const max = sortedOptions[sortedOptions.length - 1];
	let newValue = value >= min ? value : min;
	newValue = newValue <= max ? newValue : max;
	return newValue;
}

const updateArtworkSelect = (sqInchSelect, newValue) => {
	const ArtworkOptions = Array.prototype.slice.call(sqInchSelect.options);
	const fitValue = fitValueToOptionRange(newValue, ArtworkOptions);
	const filteredOptions = ArtworkOptions.filter(o => (fitValue === parseInt(o.textContent.trim(), 10)));
	if (ArtworkOptions.length > 0) {
		ArtworkOptions.filter(o => (o.selected)).forEach(o => {
			o.selected = false;
		});
		if (filteredOptions.length === 0) {
			ArtworkOptions[1].selected = true;
			return;
		}
		filteredOptions.forEach(o => {
			o.selected = true;
		});
	}
}

const calclateArtworkSize = (height, width) => {
	if (!isNaN(height) && !isNaN(width)) {
		return height * width;
	}
	return 0;
};

const customArtworkEvents = (heightInput, widthInput, sqInchSelect) => {
	heightInput.addEventListener('change', e => {
		const height = parseInt(e.target.value, 10);
		const width = parseInt(widthInput.value, 10);
		let area = calclateArtworkSize(height, width);
		updateArtworkSelect(sqInchSelect, area);
	})
	widthInput.addEventListener('change', e => {
		const width = parseInt(e.target.value, 10);
		const height = parseInt(heightInput.value, 10);
		let area = calclateArtworkSize(height, width);
		updateArtworkSelect(sqInchSelect, area);
	})
};

const getProductOptionByName = (name, options, type) => {
	const option = options.reduce((acc, o) => {
		if (!acc) {
			acc = o.display_name.indexOf(name) > -1 ? o : acc;
		}
		return acc;
	}, null);
	return option !== null ? document.getElementById(`attribute_${type}_${option.id}`) : null;
}

export const customArtworkProduct = (product) => {
	const heightInput = getProductOptionByName('Artwork Height', product.options, 'number');
	const widthInput = getProductOptionByName('Artwork Width', product.options, 'number');
	const sqInchSelect = getProductOptionByName('Artwork Square Inches', product.options, 'select');
	if (heightInput && widthInput && sqInchSelect) {
		sqInchSelect.parentElement.classList.add('is-srOnly')
		customArtworkEvents(heightInput, widthInput, sqInchSelect);
	}
};
