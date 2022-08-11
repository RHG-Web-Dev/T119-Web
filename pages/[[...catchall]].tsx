import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";
import Head from 'next/head'
import Error from "next/error";
import { PLASMIC, PREVIEW_PLASMIC } from "../plasmic-init";

/**
 * Use fetchPages() to fetch list of pages that have been created in Plasmic
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await PLASMIC.fetchPages();
  return {
    paths: pages.map((page) => ({
      params: { catchall: page.path.substring(1).split("/") },
    })),
    fallback: "blocking",
  };
};

/**
 * For each page, pre-fetch the data we need to render it
 */
export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};

  // Convert the catchall param into a path string
  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // This is some non-Plasmic catch-all page
    return {
      props: {},
    };
  }

  // This is a path that Plasmic knows about.
  // Cache the necessary data fetched for the page.
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
      <PlasmicComponent component={plasmicData.entryCompMetas[0].displayName} />
    </PlasmicRootProvider>
  );

  // Pass the data in as props.
  return {
    props: { plasmicData, queryCache, preview: context.preview ?? null },

    // Using incremental static regeneration, will invalidate this page
    // after 300s (no deploy webhooks needed)
    revalidate: 300,
  };
};

/**
 * Actually render the page!
 */
export default function CatchallPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
  preview?: boolean;
}) {
  const { plasmicData, queryCache, preview } = props;
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    // Pass in the data fetched in getStaticProps as prefetchedData
    <PlasmicRootProvider
      loader={preview ? PREVIEW_PLASMIC : PLASMIC}
      prefetchedData={preview ? undefined : plasmicData}
      prefetchedQueryData={preview ? undefined : queryCache}
    >
      {
        // plasmicData.entryCompMetas[0].displayName contains the name
        // of the component you fetched.
        // <meta name="keywords" content={pageMeta.metadata.keywords}/> Saved for later?
      }
      <PlasmicComponent component={pageMeta.displayName} />
      <Head>
         {/* Open Graph / Facebook */}
		     <meta name="theme-color" content="#515354" />
         <meta property="og:type" content="website" />
         {/* Twitter */}
         <meta property="twitter:card" content="summary_large_image" />
         <meta property="twitter:url" content="https://boyscoutstroop119.com/" />
         <meta property="twitter:title" content="Troop 119, Sevierville TN" />
         {/* <meta property="twitter:description" content={pageMeta.description} />
         <meta property="twitter:image" content={pageMeta.image} />
         {/* {/* Applications */}
         <meta name="msapplication-TileColor" content="#515354" />
         <meta name="msapplication-square150x150logo" content="/micon_x512.png" />
         <link rel="apple-touch-icon" sizes="512x512" href="/micon_x512.png" />
         <meta property="og:image" content="https://img.plasmic.app/img-optimizer/v1/img/3812756a93b80ebcdc8516239e51392f.png" />
        { /*
        <meta name="og:type" content="website"/>
        <meta name="title" content=pageMeta. />
        <meta name="description" content={pageMeta.metadata.keywords} />
        <meta name="keywords" content="T119, GSMC" />
        <meta name="robots" content="index, follow" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="1 days" />
        */}
        <link rel="manifest" href="/manifest.json" />
      </Head>
    </PlasmicRootProvider>
  );
}
