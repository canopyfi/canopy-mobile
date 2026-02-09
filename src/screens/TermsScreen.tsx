import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, fontSize, fontFamily } from '../lib/theme';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Terms of Use for Canopy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 17th, 2026</Text>

        <Section title="1. Introduction and Acceptance">
          <Text style={styles.paragraph}>
            1.1 These Terms of Use (the {'"'}Terms{'"'}) govern access to and use of the Company
            {"'"}s non-custodial, blockchain-based platform built on the Solana blockchain (the
            {'"'}Platform{'"'}). The Platform is operated by a limited liability company organized
            under the laws of the British Virgin Islands (the {'"'}Company{'"'}).
          </Text>
          <Text style={styles.paragraph}>
            1.2 The Platform is intended exclusively for members of the Company{"'"}s affiliated
            communities who hold eligible non-fungible tokens ({'"'}NFTs{'"'}) issued by or in
            collaboration with the Company or its partners ({'"'}Community Members{'"'}). By
            accessing or using the Platform, you confirm that you are an eligible Community Member
            and agree to be legally bound by these Terms.
          </Text>
        </Section>

        <Section title="2. Community-Gated Access">
          <Text style={styles.paragraph}>
            2.1 Access to the Platform and to any fundraising or project-pitching opportunities
            displayed thereon is strictly limited to Community Members who verifiably hold eligible
            NFTs in a self-custodied wallet.
          </Text>
          <Text style={styles.paragraph}>
            2.3 NFT ownership is verified on-chain. The Company does not custody, store, or control
            NFTs, wallets, or private keys and does not guarantee uninterrupted access based on NFT
            ownership.
          </Text>
        </Section>

        <Section title="3. Nature of the Platform and Non-Custodial Structure">
          <Text style={styles.paragraph}>
            3.1 The Platform provides a technical interface through which third-party project
            founders or issuers ({'"'}Project Issuers{'"'}) may present information regarding
            proposed projects, initiatives, or fundraising opportunities to Community Members.
          </Text>
          <Text style={styles.paragraph}>
            3.2 The Platform is non-custodial in nature. The Company does not take possession or
            control of digital assets, does not execute transactions on behalf of users, and does
            not control or deploy smart contracts used by Project Issuers. All interactions occur
            directly on-chain via user-controlled wallets.
          </Text>
        </Section>

        <Section title="4. No Offer, Solicitation, or Investment Advice">
          <Text style={styles.paragraph}>
            4.1 Nothing on the Platform constitutes an offer to sell, a solicitation of an offer to
            buy, or a recommendation with respect to any securities, tokens, or other financial
            instruments.
          </Text>
          <Text style={styles.paragraph}>
            4.2 The Company is not a broker-dealer, funding portal, exchange, investment adviser, or
            fiduciary. Participation in any opportunity is entirely at the discretion and risk of
            the Community Member.
          </Text>
        </Section>

        <Section title="5. Eligibility Representations">
          <Text style={styles.paragraph}>
            5.1 You represent and warrant that you are at least eighteen (18) years of age, have the
            legal capacity to enter into binding agreements, and are legally permitted to
            participate in blockchain-based activities under applicable law.
          </Text>
          <Text style={styles.paragraph}>
            5.2 You further represent that your access to and use of the Platform does not violate
            any applicable securities, financial services, consumer protection, or similar laws in
            your jurisdiction.
          </Text>
        </Section>

        <Section title="6. Restricted Jurisdictions and Sanctions Compliance">
          <Text style={styles.paragraph}>
            6.1 Access to the Platform is prohibited where such access or use would violate
            applicable sanctions, export control laws, or other legal restrictions. The Platform is
            not available to persons located in, resident of, or subject to the laws of
            jurisdictions subject to comprehensive sanctions administered by the United States,
            including those enforced by the Office of Foreign Assets Control (OFAC).
          </Text>
          <Text style={styles.paragraph}>
            6.2 By using the Platform, you represent that you are not a sanctioned person, are not
            acting on behalf of a sanctioned person, and are not located in a restricted
            jurisdiction. The Company may restrict or terminate access at any time to ensure
            compliance.
          </Text>
        </Section>

        <Section title="7. Project Issuers and Fundraising Disclosures">
          <Text style={styles.paragraph}>
            7.1 Project Issuers are solely responsible for the accuracy, completeness, and legality
            of all information provided on the Platform. The Company does not review, audit, verify,
            or endorse any project, issuer, or opportunity.
          </Text>
          <Text style={styles.paragraph}>
            7.2 Community Members acknowledge that Project Issuers may fail to deliver on stated
            objectives and that blockchain-based projects involve substantial technical, regulatory,
            and market risks.
          </Text>
        </Section>

        <Section title="8. Assumption of Risk">
          <Text style={styles.paragraph}>
            8.1 You acknowledge and accept the risks associated with blockchain technology,
            including smart contract vulnerabilities, protocol failures, network congestion,
            regulatory changes, and total loss of digital assets.
          </Text>
          <Text style={styles.paragraph}>
            8.2 The Company shall not be liable for losses arising from exploits, hacks, forks,
            validator failures, wallet compromise, or third-party protocol actions.
          </Text>
        </Section>

        <Section title="9. Intellectual Property">
          <Text style={styles.paragraph}>
            9.1 All Platform software, interfaces, trademarks, and content (excluding third-party
            project materials) are owned by or licensed to the Company and protected by intellectual
            property laws.
          </Text>
          <Text style={styles.paragraph}>
            9.2 You are granted a limited, revocable, non-transferable license to access and use the
            Platform solely in accordance with these Terms.
          </Text>
        </Section>

        <Section title="10. Prohibited Conduct">
          <Text style={styles.paragraph}>
            You agree not to engage in unlawful activity, market manipulation, fraudulent conduct,
            circumvention of access controls, or misuse of smart contracts or NFTs in connection
            with the Platform.
          </Text>
        </Section>

        <Section title="11. Disclaimer of Warranties">
          <Text style={styles.paragraph}>
            The Platform is provided on an {'"'}AS IS{'"'} and {'"'}AS AVAILABLE{'"'} basis without
            warranties of any kind, whether express or implied.
          </Text>
        </Section>

        <Section title="12. Limitation of Liability">
          <Text style={styles.paragraph}>
            12.1 To the maximum extent permitted by law, the Company shall not be liable for
            indirect, incidental, special, consequential, or punitive damages.
          </Text>
          <Text style={styles.paragraph}>
            12.2 The Company{"'"}s aggregate liability shall not exceed One Hundred United States
            dollars (USD 100).
          </Text>
        </Section>

        <Section title="13. Indemnification">
          <Text style={styles.paragraph}>
            You agree to indemnify and hold harmless the Company from any claims arising out of your
            use of the Platform or violation of these Terms.
          </Text>
        </Section>

        <Section title="14. Suspension and Termination">
          <Text style={styles.paragraph}>
            The Company may suspend or terminate access to the Platform at any time for violation of
            these Terms, applicable law, or to mitigate legal or security risk.
          </Text>
        </Section>

        <Section title="15. Governing Law and Arbitration">
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of the British Virgin Islands. Any dispute shall be
            resolved by binding arbitration administered by the British Virgin Islands, seated in
            Road Town.
          </Text>
        </Section>

        <Section title="16. Amendments and Entire Agreement">
          <Text style={styles.paragraph}>
            The Company may amend these Terms from time to time. Continued use of the Platform
            constitutes acceptance of the amended Terms.
          </Text>
          <Text style={styles.paragraph}>
            These Terms constitute the entire agreement between you and the Company regarding use of
            the Platform.
          </Text>
        </Section>

        <Section title="17. Contact Information">
          <Text style={styles.paragraph}>
            For questions regarding these Terms, please contact the Canopy Collective LTD through
            its official email: tuxr@canopy.trade
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tended by Canopy Collective LTD.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  lastUpdated: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.subheading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
    color: colors.textMuted,
  },
});
