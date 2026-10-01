import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import HomeShowcase from '../components/HomeShowcase';

export default function Home() {
  return (
    <Layout description="Draw evaluation bars next to a chessboard.">
      <header className="hero--eval">
        <div className="container">
          <h1 className="hero__title">chess-eval-bars</h1>
          <p className="hero__subtitle">
            Draw evaluation bars next to a chessboard.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--lg" to="/docs/intro">
              Get started
            </Link>
          </div>
        </div>
      </header>
      <main className="container showcase-wrap">
        <HomeShowcase />
      </main>
    </Layout>
  );
}
