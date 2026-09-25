import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

const SITE_URL = 'https://nietogreecare-site.vercel.app';
const SITE_ORIGIN = SITE_URL;

export default function HomeScreen() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const handleNavigation = useCallback((request: WebViewNavigation) => {
    const { url } = request;
    if (url === 'about:blank') return true;
    if (url === SITE_ORIGIN || url.startsWith(SITE_ORIGIN + '/')) {
      if (url.slice(SITE_ORIGIN.length).startsWith('/admin')) {
        void Linking.openURL(url);
        return false;
      }
      return true;
    }
    // Llamadas, SMS, pagos y Google OAuth se abren con la aplicación adecuada.
    if (/^(https?:|tel:|sms:|mailto:)/i.test(url)) void Linking.openURL(url).catch(() => undefined);
    return false;
  }, []);

  return <SafeAreaView style={styles.screen}>
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" onPress={() => webRef.current?.injectJavaScript(`window.location.href=${JSON.stringify(SITE_URL)}; true;`)}>
        <Text style={styles.brand}>NIETO <Text style={styles.green}>GREEN CARE</Text></Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Ingresar al panel administrativo" style={styles.adminButton} onPress={() => void Linking.openURL(`${SITE_URL}/admin`)}>
        <Text style={styles.adminText}>Panel admin</Text>
      </Pressable>
    </View>
    {failed && <View style={styles.error}><Text style={styles.errorTitle}>No se pudo conectar al sitio</Text><Text style={styles.errorBody}>Comprueba tu conexión a internet e inténtalo de nuevo.</Text><Pressable style={styles.retry} onPress={() => { setFailed(false); webRef.current?.reload(); }}><Text style={styles.retryText}>Reintentar</Text></Pressable></View>}
    <WebView
      ref={webRef}
      source={{ uri: SITE_URL }}
      style={failed ? styles.hidden : styles.webview}
      originWhitelist={['https://*']}
      onShouldStartLoadWithRequest={handleNavigation}
      onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
      onError={() => setFailed(true)}
      pullToRefreshEnabled
      startInLoadingState
      renderLoading={() => <View style={styles.loading}><ActivityIndicator size="large" color="#16a34a" /></View>}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#dcfce7' },
  toolbar: { height: 58, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#a7f3d0', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#111827', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  green: { color: '#16a34a' },
  adminButton: { backgroundColor: '#4ade80', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 9 },
  adminText: { color: '#052e16', fontSize: 13, fontWeight: '800' },
  webview: { flex: 1, backgroundColor: '#f0fdf4' },
  hidden: { flex: 0, height: 0 },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  errorTitle: { color: '#111827', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorBody: { color: '#374151', textAlign: 'center' },
  retry: { marginTop: 12, backgroundColor: '#4ade80', borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#052e16', fontWeight: '800' },
});
