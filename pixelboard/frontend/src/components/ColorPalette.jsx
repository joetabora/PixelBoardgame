const ColorPalette = ({ palette, selectedColor, onSelectColor }) => {
  return (
    <section className="panel color-palette">
      <h2>Palette</h2>
      <div className="palette-swatches">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch ${selectedColor === color ? "active" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => onSelectColor(color)}
            title={`Choose ${color}`}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </section>
  );
};

export default ColorPalette;

