// Description:
// SvgStyleEditor Class for SVGMap Authoring Tools
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class SvgStyleEditor {
	constructor() {}

	createStyleEditor(targetSvgElement, targetUiDiv, options) {
		// staticでも良いか
		const container = document.createElement("div");
		container.style.border = "1px solid #ccc";
		container.style.padding = "10px";
		container.style.display = "inline-block";

		function getComputedOrDefault(attr, defaultValue) {
			const ans = targetSvgElement.getAttribute(attr) || defaultValue;
			console.log("getComputedOrDefault:", ans);
			return String(ans);
		}

		function rgbToHex(rgb) {
			const ctx = document.createElement("canvas").getContext("2d");
			ctx.fillStyle = rgb;
			return ctx.fillStyle; // `rgb` → `#RRGGBB`
		}

		function createColorInput(labelText, attr, defaultValue) {
			const label = document.createElement("label");
			label.textContent = labelText;

			const select = document.createElement("select");
			["none", "custom"].forEach((optionValue) => {
				const option = document.createElement("option");
				option.value = optionValue;
				option.textContent = optionValue;
				select.appendChild(option);
			});

			const input = document.createElement("input");
			input.type = "color";
			let currentValue = getComputedOrDefault(attr, defaultValue);

			if (currentValue !== "none" && !currentValue.startsWith("#")) {
				currentValue = rgbToHex(currentValue);
			}

			if (currentValue === "none") {
				select.value = "none";
				input.style.display = "none";
			} else {
				select.value = "custom";
				input.style.display = "inline";
				input.value = currentValue;
			}

			select.addEventListener("change", () => {
				if (select.value === "custom") {
					input.style.display = "inline";
					targetSvgElement.setAttribute(attr, input.value);
				} else {
					input.style.display = "none";
					targetSvgElement.setAttribute(attr, "none");
				}
			});

			input.addEventListener("input", () =>
				targetSvgElement.setAttribute(attr, input.value),
			);

			label.appendChild(select);
			label.appendChild(input);
			container.appendChild(label);
			container.appendChild(document.createElement("br"));
		}

		function createInput(labelText, attr, type, defaultValue) {
			const label = document.createElement("label");
			label.textContent = labelText;

			const input = document.createElement("input");
			input.style.width = "50px";
			input.type = type;
			input.value = getComputedOrDefault(attr, defaultValue).replace("px", "");

			input.addEventListener("input", () =>
				targetSvgElement.setAttribute(
					attr,
					input.value + (type === "number" ? "px" : ""),
				),
			);

			label.appendChild(input);
			container.appendChild(label);
			container.appendChild(document.createElement("br"));
		}

		let isTextElement = false;
		if (targetSvgElement.tagName.toLowerCase() === "text") {
			isTextElement = true;
		} else if (options.editingMode == "TEXT") {
			isTextElement = true;
		}
		let isPolylineElement = false;
		if (options?.editingMode == "POLYLINE") {
			isPolylineElement = true;
		}

		if (!isPolylineElement) {
			createColorInput(
				`${isTextElement ? "Text" : "Fill"} Color: `,
				"fill",
				"black",
			);
		}
		if (!isTextElement) {
			createColorInput("Stroke Color: ", "stroke", "none");
			createInput("Stroke Width: ", "stroke-width", "number", 2);
		}
		if (isTextElement) {
			createInput("Font Size: ", "font-size", "number", 12);

			function createCheckbox(labelText, attr, value) {
				const label = document.createElement("label");
				label.textContent = labelText;

				const checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.checked = getComputedOrDefault(attr, "normal") === value;
				checkbox.addEventListener("change", () => {
					targetSvgElement.setAttribute(
						attr,
						checkbox.checked ? value : "normal",
					);
				});
				label.appendChild(checkbox);
				container.appendChild(label);
				container.appendChild(document.createElement("br"));
			}
			let noFontStyle = false;
			if (options?.fontStyle === false) {
				noFontStyle = true;
			}
			if (!noFontStyle) {
				createCheckbox("Bold", "font-weight", "bold");
				createCheckbox("Italic", "font-style", "italic");
			}
		}
		targetUiDiv.appendChild(container);
	}
}

export { SvgStyleEditor };
