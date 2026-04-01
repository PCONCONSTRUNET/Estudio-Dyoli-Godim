import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
}

const SEO = ({ 
  title = "Studio Dyoli Godim | Micropigmentação, Tatoo e Piercing",
  description = "Procedimentos estéticos com segurança e precisão. Micropigmentação fio a fio, labial e perfuração corporal com material premium."
}: SEOProps) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  </Helmet>
);

export default SEO;
