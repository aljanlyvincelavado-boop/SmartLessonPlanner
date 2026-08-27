import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type AppView = 'auth' | 'dashboard' | 'create';

const subjects = ['Mathematics', 'Science', 'English', 'Filipino', 'Araling Panlipunan', 'Computer Programming', 'Physical Education'];
const grades = ['Grade 1-3', 'Grade 4-6', 'Grade 7-9', 'Grade 10-12'];
const colors = { ink: '#173B36', paper: '#FCFAF5', accent: '#E07A5F', pale: '#E7F0E6', muted: '#788580', line: '#DCE4DC' };

type AuthProps = { isRegistering: boolean; setIsRegistering: (value: boolean) => void; onSubmit: () => void };
type FormProps = { subject: string; grade: string; topic: string; objectives: string; setSubject: (value: string) => void; setGrade: (value: string) => void; setTopic: (value: string) => void; setObjectives: (value: string) => void; onBack: () => void };

export default function HomeScreen() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [view, setView] = useState<AppView>('auth');
  const [isRegistering, setIsRegistering] = useState(false);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [objectives, setObjectives] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  if (isSplashVisible) return <View style={styles.splash}><View style={styles.logoMark}><Ionicons name="sparkles" size={28} color={colors.ink} />
  </View><Text style={styles.splashTitle}>LessonPlanner</Text><Text style={styles.splashCaption}>Plan with purpose.</Text></View>;
  if (view === 'auth') return <AuthScreen isRegistering={isRegistering} setIsRegistering={setIsRegistering} onSubmit={() => setView('dashboard')} />;
  if (view === 'create') return <LessonForm subject={subject} grade={grade} topic={topic} objectives={objectives} setSubject={setSubject} setGrade={setGrade} setTopic={setTopic} setObjectives={setObjectives} onBack={() => setView('dashboard')} />;
  return <Dashboard onCreate={() => setView('create')} onSignOut={() => setView('auth')} />;
}

function Brand() { return <View style={styles.authBrand}><View style={styles.smallLogo}>
  <Ionicons name="sparkles" size={18} color={colors.ink} /></View><Text style={styles.brandName}>LessonPlanner</Text></View>; }
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} /></View>; }


// SIGN IN PAGE --------

function AuthScreen({ isRegistering, setIsRegistering, onSubmit }: AuthProps) {
  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
    <Brand /><View style={styles.authIntro}><Text style={styles.eyebrow}>YOUR CLASSROOM, CLEARER</Text><Text style={styles.heading}>{isRegistering ? 'Create your account.' : 'Make every lesson count.'}</Text><Text style={styles.mutedText}>{isRegistering ? 'Start building thoughtful lessons in minutes.' : 'A calm space for thoughtful teaching and better preparation.'}</Text></View>
    {isRegistering && <Field label="Full name" placeholder="Alex Morgan" />}
    <Field label="Email address" placeholder="you@school.com" keyboardType="email-address" />
    <Field label="Password" placeholder="At least 8 characters" secureTextEntry />
    <Field label="Confirm Password" placeholder="******" secureTextEntry />
    
    <Pressable style={styles.primaryButton} onPress={onSubmit}><Text style={styles.primaryButtonText}>{isRegistering ? 'Create account' : 'Sign in'}</Text><Ionicons name="arrow-forward" size={18} color={colors.paper} /></Pressable> 
    <Text style={styles.switchAuth} onPress={() => setIsRegistering(!isRegistering)}>Continue with google</Text>
    <Pressable style={styles.switchAuth} onPress={() => setIsRegistering(!isRegistering)}><Text style={styles.switchText}>{isRegistering ? 'Already have an account? ' : 'New to LessonPlanner? '}<Text style={styles.switchAction}>{isRegistering ? 'Sign in' : 'Register'}</Text></Text></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

// INSIDE THE APP --------

function Dashboard({ onCreate, onSignOut }: { onCreate: () => void; onSignOut: () => void }) {
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}><View style={styles.topBar}><Brand />
  <Pressable onPress={onSignOut} hitSlop={12}><Ionicons name="log-out-outline" size={22} color={colors.ink} /></Pressable></View>
    <Text style={styles.eyebrow}>MONDAY, 24 AUGUST</Text><Text style={styles.dashboardHeading}>Good morning, Alex.</Text><Text style={styles.mutedText}>What will you make space for today?</Text>
    <Pressable style={styles.createCard} onPress={onCreate}><View><Text style={styles.createKicker}>START FROM SCRATCH</Text><Text style={styles.createTitle}>Create a lesson plan</Text><Text style={styles.createDescription}>Turn an idea into a focused classroom experience.</Text></View><View style={styles.arrowCircle}><Ionicons name="arrow-forward" size={20} color={colors.ink} /></View></Pressable>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your workspace</Text><Text style={styles.countText}>0 plans</Text></View><View style={styles.emptyState}><Ionicons name="documents-outline" size={32} color={colors.accent} /><Text style={styles.emptyTitle}>Your lesson plans will live here.</Text><Text style={styles.emptyDescription}>Create your first plan and keep your best thinking close.</Text></View>
  </ScrollView></SafeAreaView>;
}

// CREATE LESSON FORM --------

function LessonForm({ subject, grade, topic, objectives, setSubject, setGrade, setTopic, setObjectives, onBack }: FormProps) {
  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled"><View style={styles.topBar}><Pressable onPress={onBack} hitSlop={12}><Ionicons name="arrow-back" size={23} color={colors.ink} /></Pressable><Text style={styles.formTopTitle}>New lesson plan</Text><View style={{ width: 23 }} /></View><View style={styles.progressTrack}><View style={styles.progressFill} /></View>
    <Text style={styles.eyebrow}>STEP 1 OF 3</Text><Text style={styles.dashboardHeading}>Set the direction.</Text><Text style={styles.mutedText}>A few details will help shape a lesson that fits your classroom.</Text><Text style={styles.formSectionTitle}>Subject</Text><View style={styles.chipWrap}>{subjects.map((item) => <ChoiceChip key={item} label={item} selected={subject === item} onPress={() => setSubject(item)} />)}</View><Text style={styles.formSectionTitle}>Grade level</Text><View style={styles.chipWrap}>{grades.map((item) => <ChoiceChip key={item} label={item} selected={grade === item} onPress={() => setGrade(item)} />)}</View>
    <Field label="Topic" placeholder="e.g. The water cycle" value={topic} onChangeText={setTopic} /><View style={styles.fieldGroup}><Text style={styles.fieldLabel}>Learning objectives</Text><TextInput style={[styles.input, styles.textArea]} placeholder="What should students understand or be able to do?" placeholderTextColor={colors.muted} multiline value={objectives} onChangeText={setObjectives} textAlignVertical="top" /></View><Pressable style={[styles.primaryButton, (!subject || !grade || !topic) && styles.disabledButton]} disabled={!subject || !grade || !topic} onPress={onBack}><Text style={styles.primaryButtonText}>Continue</Text><Ionicons name="arrow-forward" size={18} color={colors.paper} /></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

// CSS --------

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, selected && styles.selectedChip]}><Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: colors.paper },
   splash: { flex: 1, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
    logoMark: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
     splashTitle: { color: colors.ink, fontSize: 30, fontWeight: '800' },
      splashCaption: { color: colors.muted, fontSize: 15, marginTop: 8 },
       authContent: { flexGrow: 1, padding: 28, justifyContent: 'center' },
        pageContent: { padding: 24, paddingBottom: 48 },
         authBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
          smallLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
           brandName: { color: colors.ink, fontWeight: '800', fontSize: 17 }, authIntro: { marginTop: 72, marginBottom: 34 },
            eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
             heading: { color: colors.ink, fontSize: 39, lineHeight: 43, fontWeight: '800', maxWidth: 340 },
              dashboardHeading: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '800', marginBottom: 8 },
               mutedText: { color: colors.muted, fontSize: 16, lineHeight: 24 }, fieldGroup: { marginBottom: 19 },
                fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 8 },
                 input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#FFFFFF', color: colors.ink, fontSize: 16, paddingHorizontal: 15, height: 52 },
                  textArea: { height: 110, paddingTop: 14 },
                   primaryButton: { height: 54, borderRadius: 11, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
                    primaryButtonText: { color: colors.paper, fontSize: 16, fontWeight: '800' },
                     disabledButton: { opacity: 0.4 },
                      switchAuth: { alignItems: 'center', marginTop: 24 },
                       switchText: { color: colors.muted, fontSize: 14 },
                        switchAction: { color: colors.ink, fontWeight: '800' },
                         topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 44 },
                          createCard: { backgroundColor: colors.ink, borderRadius: 16, padding: 22, marginTop: 34, minHeight: 190, justifyContent: 'space-between' },
                           createKicker: { color: '#A9C8B2', fontWeight: '800', fontSize: 11, letterSpacing: 1.2, marginBottom: 14 },
                            createTitle: { color: colors.paper, fontSize: 26, fontWeight: '800', marginBottom: 8 },
                             createDescription: { color: '#C3D3C7', fontSize: 15, lineHeight: 22, maxWidth: 260 },
                              arrowCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
                               sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 38, marginBottom: 14 },
                                sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
                                 countText: { color: colors.muted, fontSize: 13 },
                                  emptyState: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 28, alignItems: 'center', backgroundColor: '#FFFFFF' },
                                   emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 16, textAlign: 'center' },
                                    emptyDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
                                     formTopTitle: { color: colors.ink, fontWeight: '800', fontSize: 17 },
                                      progressTrack: { height: 5, backgroundColor: colors.line, borderRadius: 3, marginBottom: 32 },
                                       progressFill: { width: '33%', height: 5, backgroundColor: colors.accent, borderRadius: 3 },
                                        formSectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 28, marginBottom: 12 },
                                         chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
                                          chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12 },
                                           selectedChip: { borderColor: colors.ink, backgroundColor: colors.ink },
                                            chipText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
                                             selectedChipText: { color: colors.paper },
});
