import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { TargetProfile } from '@/types';

// 1. CZCIONKA PL (Roboto)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontStyle: 'italic' }
  ]
});

// PROXY (Kluczowe dla wyświetlania zdjęć z Instagrama w PDF)
const getProxyUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Roboto', 
    fontSize: 10,
    color: '#333',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  meta: {
    fontSize: 8,
    textAlign: 'right',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    color: '#000',
    borderLeftWidth: 3,
    borderLeftColor: '#000',
    paddingLeft: 6,
  },
  // IDENTYFIKACJA
  identityContainer: { flexDirection: 'row', gap: 15 },
  avatarImage: { width: 70, height: 70, borderRadius: 4, objectFit: 'cover', backgroundColor: '#f0f0f0', border: '1px solid #ddd' },
  identityDetails: { flex: 1 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 100, fontWeight: 'bold', fontSize: 9, color: '#555' },
  value: { flex: 1, fontSize: 9 },
  // Styl dla Ghost Data
  ghostValue: { flex: 1, fontSize: 9, color: '#2563eb', fontWeight: 'bold' },
  
  bioText: { fontStyle: 'italic', lineHeight: 1.4, fontSize: 9, marginTop: 6, color: '#444', padding: 6, backgroundColor: '#f9f9f9', borderRadius: 2 },
  analysisText: { lineHeight: 1.5, textAlign: 'justify', fontSize: 9 },
  
  // LEAK SECTION
  leakRow: { flexDirection: 'row', marginBottom: 4, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: '#fee' },
  leakLabel: { width: 100, fontWeight: 'bold', fontSize: 9, color: '#b91c1c' },
  leakValue: { flex: 1, fontSize: 9, color: '#000', fontWeight: 'bold' },

  // POSTY
  postContainer: { marginBottom: 12, flexDirection: 'row', gap: 12, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee', minHeight: 50 },
  postImage: { width: 60, height: 60, objectFit: 'cover', borderRadius: 2, backgroundColor: '#f0f0f0', border: '1px solid #eee' },
  postContentBox: { flex: 1 },
  postDate: { fontSize: 7, color: '#777', marginBottom: 3, fontWeight: 'bold', textTransform: 'uppercase' },
  postText: { fontSize: 9, lineHeight: 1.3, color: '#222' },

  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 7, textAlign: 'center', color: '#aaa', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }
});

interface ReportProps {
  target: TargetProfile;
}

export const ReportDocument: React.FC<ReportProps> = ({ target }) => {
  const date = new Date().toISOString().split('T')[0];
  const postLimit = target.postsAnalysis?.length || 0;
  const latestLocation = target.locations && target.locations.length > 0 ? target.locations[0] : null;

  // Sprawdzamy czy są dane z wycieków do wyświetlenia
  const hasLeakData = (target.leakVerifiedEmails && target.leakVerifiedEmails.length > 0) ||
                      (target.leakVerifiedPhones && target.leakVerifiedPhones.length > 0) ||
                      (target.leakVerifiedIps && target.leakVerifiedIps.length > 0) ||
                      target.leakVerifiedDob ||
                      target.leakVerifiedAddress ||
                      (target.leakVerifiedPass && target.leakVerifiedPass.length > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.title}>V.E.S.P.E.R.</Text>
            <Text style={styles.subtitle}>Virtual Entity for Social Profiling & Evidence Retrieval</Text>
          </View>
          <View style={styles.meta}>
            <Text>ID SPRAWY: {target.id.slice(0, 8).toUpperCase()}</Text>
            <Text>DATA: {date}</Text>
            <Text>KLAUZULA: POUFNE (LVL 3)</Text>
          </View>
        </View>

        {/* I. TOŻSAMOŚĆ (Oficjalne dane) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. IDENTYFIKACJA CELU</Text>
          <View style={styles.identityContainer}>
            {target.avatarUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={getProxyUrl(target.avatarUrl)} style={styles.avatarImage} />
            ) : (
                <View style={[styles.avatarImage, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 8 }}>BRAK</Text>
                </View>
            )}
            <View style={styles.identityDetails}>
                <View style={styles.row}><Text style={styles.label}>Użytkownik:</Text><Text style={styles.value}>@{target.username}</Text></View>
                <View style={styles.row}><Text style={styles.label}>Pełna Nazwa:</Text><Text style={styles.value}>{target.fullName || 'Nieznane'}</Text></View>
                <View style={styles.row}><Text style={styles.label}>Ryzyko:</Text><Text style={styles.value}>{target.risk === 'high' || target.risk === 'critical' ? 'KRYTYCZNE / WYSOKIE' : target.risk === 'medium' ? 'ŚREDNIE' : 'NIEZNANE'}</Text></View>
                
                {/* --- GHOST DATA (DANE Z HEADERA) --- */}
                {target.publicEmail && (
                    <View style={styles.row}><Text style={styles.label}>Email (Bio):</Text><Text style={styles.ghostValue}>{target.publicEmail}</Text></View>
                )}
                {target.publicPhone && (
                    <View style={styles.row}><Text style={styles.label}>Telefon (Bio):</Text><Text style={styles.ghostValue}>{target.publicPhone}</Text></View>
                )}
                {target.externalUrl && (
                    <View style={styles.row}><Text style={styles.label}>Link:</Text><Text style={styles.ghostValue}>{target.externalUrl}</Text></View>
                )}
                {latestLocation && (
                    <View style={styles.row}><Text style={styles.label}>Lokalizacja:</Text><Text style={styles.ghostValue}>{latestLocation.city || latestLocation.name}</Text></View>
                )}
                {target.isBusiness && (
                    <View style={styles.row}><Text style={styles.label}>Kategoria:</Text><Text style={styles.value}>{target.businessCategory || 'Konto Firmowe'}</Text></View>
                )}
                
                <View style={{ marginTop: 4 }}><Text style={styles.label}>BIO:</Text><Text style={styles.bioText}>{target.bio?.replace(/\n/g, ' ') || 'Brak wpisu BIO'}</Text></View>
                
                <View style={[styles.row, { marginTop: 4, justifyContent: 'flex-end', opacity: 0.6 }]}><Text style={styles.label}>Statystyki:</Text><Text style={styles.value}>{target.stats?.followers || 0} Obserwujących | {target.stats?.posts || 0} Postów</Text></View>
            </View>
          </View>
        </View>

        {/* II. IDENTITY VAULT (WYCIEKI - DANE ZWERYFIKOWANE) */}
        {hasLeakData && (
          <View style={[styles.section, { backgroundColor: '#fff5f5' }]}>
             <Text style={[styles.sectionTitle, { color: '#b91c1c', borderLeftColor: '#b91c1c' }]}>
                II. DANE ZWERYFIKOWANE (WYCIEKI)
             </Text>
             <View style={{ gap: 2 }}>
                {target.leakVerifiedEmails && target.leakVerifiedEmails.length > 0 && (
                    <View style={styles.leakRow}>
                        <Text style={styles.leakLabel}>E-MAILE:</Text>
                        <Text style={styles.leakValue}>{target.leakVerifiedEmails.join(', ')}</Text>
                    </View>
                )}
                {target.leakVerifiedPhones && target.leakVerifiedPhones.length > 0 && (
                    <View style={styles.leakRow}>
                        <Text style={styles.leakLabel}>TELEFONY:</Text>
                        <Text style={styles.leakValue}>{target.leakVerifiedPhones.join(', ')}</Text>
                    </View>
                )}
                {target.leakVerifiedDob && (
                    <View style={styles.leakRow}>
                        <Text style={styles.leakLabel}>DATA URO.:</Text>
                        <Text style={styles.leakValue}>{target.leakVerifiedDob}</Text>
                    </View>
                )}
                {target.leakVerifiedAddress && (
                    <View style={styles.leakRow}>
                        <Text style={styles.leakLabel}>ADRES:</Text>
                        <Text style={styles.leakValue}>{target.leakVerifiedAddress}</Text>
                    </View>
                )}
                {target.leakVerifiedIps && target.leakVerifiedIps.length > 0 && (
                    <View style={styles.leakRow}>
                        <Text style={styles.leakLabel}>ADRESY IP:</Text>
                        <Text style={styles.leakValue}>{target.leakVerifiedIps.join(', ')}</Text>
                    </View>
                )}
                {target.leakVerifiedPass && target.leakVerifiedPass.length > 0 && (
                    <View style={styles.leakRow}>
                        <Text style={styles.leakLabel}>HASŁA:</Text>
                        <Text style={[styles.leakValue, { color: '#ef4444' }]}>{target.leakVerifiedPass.length} HASHES (CONFIDENTIAL)</Text>
                    </View>
                )}
             </View>
          </View>
        )}

        {/* III. ANALIZA AI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>III. PROFIL PSYCHOLOGICZNY (AI)</Text>
          <Text style={styles.analysisText}>
            {target.aiAnalysis || "Brak danych analizy. Wykonaj pełny skan (Deep Dive), aby wygenerować profil."}
          </Text>
        </View>

        {/* IV. POSTY */}
        {target.postsAnalysis && target.postsAnalysis.length > 0 && (
          <View style={[styles.section, { borderBottomWidth: 0 }]}>
            <Text style={styles.sectionTitle}>IV. ANALIZA TREŚCI ({postLimit} najnowszych)</Text>
            {target.postsAnalysis.map((post, index) => (
              <View key={index} style={styles.postContainer} wrap={false}>
                {post.mediaUrl && post.mediaUrl !== target.avatarUrl ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={getProxyUrl(post.mediaUrl)} style={styles.postImage} />
                ) : (
                    <View style={[styles.postImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' }]}>
                        <Text style={{ fontSize: 7, color: '#999' }}>TEKST</Text>
                    </View>
                )}
                <View style={styles.postContentBox}>
                    <Text style={styles.postDate}>REF #{index + 1} | {post.date.split('T')[0]}</Text>
                    <Text style={styles.postText}>
                        {post.caption ? post.caption.slice(0, 350) : '[Brak opisu]'}
                        {post.caption && post.caption.length > 350 ? '...' : ''}
                    </Text>
                    {post.comments.length > 0 && (
                        <Text style={[styles.postText, { color: '#666', marginTop: 4, fontSize: 8, fontStyle: 'italic' }]}>
                            KOMENTARZE: {post.comments.slice(0, 2).join(' | ')}
                        </Text>
                    )}
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          WYGENEROWANO PRZEZ SYSTEM V.E.S.P.E.R. | AUTOMATYCZNY RAPORT OSINT | CASE_{target.id.slice(0,8)}
        </Text>
      </Page>
    </Document>
  );
};
