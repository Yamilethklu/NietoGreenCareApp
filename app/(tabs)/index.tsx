import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { QuoteRequestForm } from '@/src/components/QuoteRequestForm';
import { Button, Screen } from '@/src/components/ui';
import { colors } from '@/src/lib/theme';

const heroBackground = require('../../assets/images/hero-bg.jpg');

export default function HomeScreen() {
  return <Screen><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.heroContainer}>
      <ImageBackground source={heroBackground} resizeMode="cover" style={s.heroImage} imageStyle={s.heroImageStyle}>
        <View style={s.overlay} />
        <View style={s.heroContent}>
          <Text style={s.brand}>NIETO GREEN CARE LLC</Text>
          <Text style={s.subtitle}>LAWN CARE | LANDSCAPING | MAINTENANCE</Text>
          <Button label="Iniciar Sesión / Administrador" onPress={() => router.push('/admin')} variant="outline" />
        </View>
      </ImageBackground>
    </View>
    <View style={s.quoteSection}><QuoteRequestForm embedded /></View>
  </ScrollView></Screen>;
}

const s = StyleSheet.create({
  content: { paddingBottom: 24 },
  heroContainer: { width: '100%', overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroImage: { width: '100%', minHeight: 300, justifyContent: 'center' },
  heroImageStyle: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  heroContent: { minHeight: 300, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 38, gap: 14 },
  brand: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.25, lineHeight: 19, textAlign: 'center', marginBottom: 8 },
  quoteSection: { paddingHorizontal: 14, paddingTop: 22, backgroundColor: colors.background },
});