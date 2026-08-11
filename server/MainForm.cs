using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.WinForms;

public class MainForm : Form
{
    // Matches the app's --color-bg-elevated (#10161d) nav bar color.
    private const int TitleBarColor = 0x001D1610;
    private const int TitleBarTextColor = 0x00FFFFFF;
    private const int TitleBarBorderColor = 0x002E251C;

    private const int DwmwaUseImmersiveDarkMode = 20;
    private const int DwmwaBorderColor = 34;
    private const int DwmwaCaptionColor = 35;
    private const int DwmwaTextColor = 36;

    public MainForm(string url)
    {
        Text = "Gearscribe";
        Width = 1280;
        Height = 800;
        StartPosition = FormStartPosition.CenterScreen;

        var webView = new WebView2 { Dock = DockStyle.Fill };
        Controls.Add(webView);

        Load += async (_, _) =>
        {
            await webView.EnsureCoreWebView2Async(null);
            webView.CoreWebView2.Navigate(url);
        };
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);

        var darkMode = 1;
        DwmSetWindowAttribute(Handle, DwmwaUseImmersiveDarkMode, ref darkMode, sizeof(int));

        var captionColor = TitleBarColor;
        DwmSetWindowAttribute(Handle, DwmwaCaptionColor, ref captionColor, sizeof(int));

        var textColor = TitleBarTextColor;
        DwmSetWindowAttribute(Handle, DwmwaTextColor, ref textColor, sizeof(int));

        var borderColor = TitleBarBorderColor;
        DwmSetWindowAttribute(Handle, DwmwaBorderColor, ref borderColor, sizeof(int));
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);
}
