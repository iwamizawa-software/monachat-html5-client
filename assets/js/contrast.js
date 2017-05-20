function Contrast()
    {
        this.luminiscence   = luminiscence;
        this.contrast_ratio = contrast_ratio;
    }

module.exports = new Contrast();

function luminiscence(r, g, b)
    {
        var Rg = r <= 10 ? r/3294 : Math.pow( r/269 + 0.0513, 2.4 );
        var Gg = g <= 10 ? g/3294 : Math.pow( g/269 + 0.0513, 2.4 );
        var Bg = b <= 10 ? b/3294 : Math.pow( b/269 + 0.0513, 2.4 );
        
        var L = 0.2126 * Rg + 0.7152 * Gg + 0.0722 * Bg;
        
        return L;
    }

function contrast_ratio(L1, L2)
    {
        return (L1 + 0.05) / (L2 + 0.05);
    }