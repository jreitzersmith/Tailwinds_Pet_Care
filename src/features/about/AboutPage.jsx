import { Link } from 'react-router-dom';
import { COLORS, FONTS } from '../../constants.jsx';

const PETS_SERVED = [
  'Dogs', 'Cats', 'Fish & Aquariums', 'Turtles', 'Snakes', 'Lizards',
  'Guinea Pigs', 'Hamsters', 'Rats & Mice', 'Gerbils', 'Chinchillas',
  'Parakeets', 'Finches', 'Lovebirds', 'Conures', 'Parrots', 'Chickens',
];

function AboutPage() {
  const heroStyle = {
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    textAlign: 'center',
    padding: '3.5rem 1.5rem',
  };

  const h1Style = {
    fontFamily: FONTS.header,
    fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
    marginBottom: '0.75rem',
  };

  const heroSubStyle = {
    fontFamily: FONTS.body,
    fontSize: '1.05rem',
    opacity: 0.9,
    maxWidth: '540px',
    margin: '0 auto',
    lineHeight: 1.6,
  };

  const sectionHeadingStyle = {
    fontFamily: FONTS.header,
    fontSize: '1.6rem',
    color: COLORS.blue,
    marginBottom: '1rem',
  };

  const bodyStyle = {
    fontFamily: FONTS.body,
    fontSize: '1rem',
    color: '#444',
    lineHeight: 1.8,
    marginBottom: '1rem',
  };

  const pullQuoteStyle = {
    fontFamily: FONTS.accent,
    fontSize: '1.15rem',
    color: COLORS.blue,
    fontStyle: 'italic',
    borderLeft: `4px solid ${COLORS.blue}`,
    paddingLeft: '1.25rem',
    margin: '1.75rem 0',
    lineHeight: 1.7,
  };

  const chipGridStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    marginTop: '0.75rem',
  };

  const chipStyle = {
    backgroundColor: '#e8f4fc',
    color: COLORS.black,
    fontFamily: FONTS.body,
    fontSize: '0.88rem',
    fontWeight: '600',
    padding: '0.35rem 0.85rem',
    borderRadius: '999px',
    border: `1px solid ${COLORS.lightBlue}`,
  };

  const insuranceBoxStyle = {
    backgroundColor: '#f4f8fb',
    border: '1px solid #dde8f4',
    borderRadius: '6px',
    padding: '1.5rem 1.75rem',
    marginTop: '1rem',
  };

  const insuranceRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem 2rem',
    fontFamily: FONTS.body,
    fontSize: '0.93rem',
    color: '#444',
    marginTop: '0.75rem',
  };

  const insuranceLabelStyle = {
    fontWeight: '700',
    color: COLORS.black,
  };

  const dividerStyle = {
    border: 'none',
    borderTop: '1px solid #dde8f4',
    margin: '2.5rem 0',
  };

  const ctaStyle = {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    fontFamily: FONTS.body,
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.9rem 2.25rem',
    borderRadius: '4px',
    textDecoration: 'none',
    display: 'inline-block',
  };

  return (
    <>
      <section style={heroStyle}>
        <h1 style={h1Style}>About Tailwinds Pet Care</h1>
        <p style={heroSubStyle}>
          A Dallas-based pet care service built by a lifelong animal lover —
          insured, bonded, and proudly serving the DFW airline community.
        </p>
      </section>

      <div className='page-container'>

        <section>
          <h2 style={sectionHeadingStyle}>Meet John</h2>
          <p style={bodyStyle}>
            Hi, I&apos;m John Reitzer-Smith, the owner and operator of Tailwinds Pet Care. I&apos;m a
            lifelong animal lover who has personally owned dogs, cats, rats, gerbils, guinea
            pigs, snakes, lizards, turtles, and fish. At home right now you&apos;ll find my American
            Eskimo and my red Boston Terrier — two very different personalities who keep things
            interesting.
          </p>
          <p style={bodyStyle}>
            Before starting Tailwinds, I spent six years at PetSmart as the Department Manager
            for Specialty Pet Care. I was responsible for the daily care, health monitoring, habitat
            maintenance, and hands-on attention of every non-canine and non-feline creature in the
            store — fish, turtles, snakes, lizards, guinea pigs, hamsters, rats, gerbils, mice,
            chinchillas, parakeets, finches, lovebirds, conures, and parrots. That experience gave
            me a level of comfort with exotic and specialty animals that most pet sitters simply
            don&apos;t have.
          </p>
          <blockquote style={pullQuoteStyle}>
            &ldquo;One of my most treasured experiences was an African Grey parrot who lived with us for
            13 months. He figured out that if he called out &lsquo;John, to the Aviary&rsquo; — the same phrase
            the cashiers announced over the intercom — I would come running. So he started saying it
            whenever he wanted a treat or just some attention. I also had the privilege of raising
            conures and Emerald Green lizards from egg all the way through to adoption.&rdquo;
          </blockquote>
          <p style={bodyStyle}>
            That kind of connection — with animals of all species — is what Tailwinds is built on.
            Whether your pet has four legs, no legs, wings, or fins, they will be in experienced hands.
          </p>
        </section>

        <hr style={dividerStyle} />

        <section>
          <h2 style={sectionHeadingStyle}>Built for the Airline Community</h2>
          <p style={bodyStyle}>
            Tailwinds Pet Care was founded specifically with Southwest and American Airlines crew
            members in mind. We understand that your schedule is unpredictable — trips extend,
            pairings change, and layovers can turn into overnights. Your pets deserve consistent,
            reliable care no matter what your day looks like. That is exactly what we provide.
          </p>
          <p style={bodyStyle}>
            From quick drop-in visits to extended multi-day care packages, our services are
            designed to flex around your airline schedule — not the other way around.
          </p>
        </section>

        <hr style={dividerStyle} />

        <section>
          <h2 style={sectionHeadingStyle}>Pets We Care For</h2>
          <p style={bodyStyle}>
            We don&apos;t just do dogs and cats. Our experience covers a wide range of species:
          </p>
          <div style={chipGridStyle}>
            {PETS_SERVED.map((pet) => (
              <span key={pet} style={chipStyle}>{pet}</span>
            ))}
          </div>
        </section>

        <hr style={dividerStyle} />

        <section>
          <h2 style={sectionHeadingStyle}>Insured &amp; Bonded</h2>
          <p style={bodyStyle}>
            Tailwinds Pet Care is fully insured and bonded through Pet Sitters Associates (PSA),
            one of the most respected insurance providers in the pet care industry. You can verify
            our coverage and view our provider profile directly on the PSA website.
          </p>
          <div style={insuranceBoxStyle}>
            <div style={{ fontFamily: FONTS.header, fontWeight: '700', marginBottom: '0.25rem' }}>
              Pet Sitters Associates
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: '0.85rem', color: '#777', marginBottom: '0.75rem' }}>
              Underwritten by Evanston Insurance Company &middot; Effective June 19, 2026
            </div>
            <div style={insuranceRowStyle}>
              <div>
                <span style={insuranceLabelStyle}>General Liability</span><br />
                $1,000,000 per occurrence / $2,000,000 aggregate
              </div>
              <div>
                <span style={insuranceLabelStyle}>Animal Liability</span><br />
                $100,000 per occurrence / $200,000 aggregate
              </div>
              <div>
                <span style={insuranceLabelStyle}>Pet Loss (Care, Custody &amp; Control)</span><br />
                $25,000 per occurrence / $30,000 annual
              </div>
              <div>
                <span style={insuranceLabelStyle}>Vet Expense</span><br />
                $2,500 per occurrence / $5,000 annual
              </div>
              <div>
                <span style={insuranceLabelStyle}>Customer Property</span><br />
                $10,000 per occurrence / $25,000 annual
              </div>
              <div>
                <span style={insuranceLabelStyle}>Bond</span><br />
                Included via Broadened Property Damage Coverage
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <a
                href='https://www.petsitllc.com/provider/MOEA5N7QEY/dallas-tx/tailwinds-pet-care'
                target='_blank'
                rel='noopener noreferrer'
                style={{ fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.blue, fontWeight: '600' }}
              >
                View our PSA provider profile →
              </a>
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        <div style={{ textAlign: 'center', paddingBottom: '3rem' }}>
          <p style={{ fontFamily: FONTS.body, color: '#555', marginBottom: '1.25rem' }}>
            Ready to schedule care for your pet?
          </p>
          <Link to='/contact' style={ctaStyle}>Get in Touch</Link>
        </div>

      </div>
    </>
  );
}

export default AboutPage;
