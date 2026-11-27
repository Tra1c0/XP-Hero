package de.xphero.app;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Bildschirm bleibt an, solange das Spiel im Vordergrund ist
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Haptik-Brücke: das Spiel übergibt ein Muster "Dauer,Stärke;Dauer,Stärke;..." (Stärke 0 = Pause)
        try {
            Vibrator vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vib != null && vib.hasVibrator() && getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new Haptic(vib), "XPHaptic");
            }
        } catch (Exception e) { /* ohne Haptik weiter */ }
    }

    static class Haptic {
        private final Vibrator vib;
        Haptic(Vibrator v) { vib = v; }

        @JavascriptInterface
        public void play(String pattern) {
            try {
                String[] parts = pattern.split(";");
                int n = Math.min(parts.length, 12);
                long[] times = new long[n];
                int[] amps = new int[n];
                long total = 0;
                for (int i = 0; i < n; i++) {
                    String[] p = parts[i].split(",");
                    times[i] = Math.max(1, Math.min(200, Long.parseLong(p[0].trim())));
                    amps[i] = Math.max(0, Math.min(255, Integer.parseInt(p[1].trim())));
                    total += times[i];
                }
                if (Build.VERSION.SDK_INT >= 26) {
                    if (!vib.hasAmplitudeControl()) { for (int i = 0; i < n; i++) if (amps[i] > 0) amps[i] = VibrationEffect.DEFAULT_AMPLITUDE; }
                    if (n == 1) vib.vibrate(VibrationEffect.createOneShot(times[0], amps[0] == 0 ? 1 : amps[0]));
                    else vib.vibrate(VibrationEffect.createWaveform(times, amps, -1));
                } else {
                    vib.vibrate(total);
                }
            } catch (Exception e) { /* ungültiges Muster ignorieren */ }
        }
    }
}
